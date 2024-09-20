import { z } from "zod";
import { globalActionStore } from "./globalStores";
import { InputSchemas, INPUT_SCHEMAS } from "./ioSchema";
import { Failure } from "./Failure";

function ioRequestHandler<T extends keyof InputSchemas>(
  methodName: T,
  props: z.infer<InputSchemas[T]["props"]>
) {
  let resolve: (value: z.infer<InputSchemas[T]["returns"]>) => void;
  let promise = new Promise<z.infer<InputSchemas[T]["returns"]>>((r, _) => {
    resolve = r;
  });

  const schema = INPUT_SCHEMAS[methodName];
  return {
    submitResponse: (body: any) => {
      const parsedBody = schema.returns.safeParse(body);
      if (!parsedBody.success) {
        return new Failure(parsedBody.error);
      }
      resolve(parsedBody.data);
    },
    promise,
    request: { methodName, props },
  };
}

type IORequestHandler = ReturnType<typeof ioRequestHandler>;

class Transaction {
  private state: "running" | "success" | "error" = "running";
  private subscribers = new Set<() => void>();

  pendingIORequest: IORequestHandler | null = null;

  subscribe(fn: () => void) {
    this.subscribers.add(fn);
    return {
      unsubscribe: () => {
        this.subscribers.delete(fn);
      },
    };
  }

  onStateChange() {
    for (const fn of this.subscribers) {
      fn();
    }
  }

  #setState(state: "running" | "success" | "error") {
    this.state = state;
    this.onStateChange();
  }

  getState() {
    return {
      state: this.state,
      pendingIORequest: this.pendingIORequest?.request ?? null,
    };
  }

  respondToIORequest(body: any) {
    if (!this.pendingIORequest) {
      return new Failure(`No pending IO request`);
    }
    const result = this.pendingIORequest.submitResponse(body);
    return result;
  }

  constructor(public id: number, fn: () => Promise<void>) {
    globalActionStore.run(
      {
        makeIORequest: async (methodName, props) => {
          console.log("createIORequest", methodName, props);
          this.pendingIORequest = ioRequestHandler(methodName, props);
          this.onStateChange();
          const value = await this.pendingIORequest.promise;
          this.pendingIORequest = null;
          this.onStateChange();
          return value;
        },
      },
      () =>
        fn()
          .then(() => {
            this.#setState("success");
          })
          .catch(() => {
            this.#setState("error");
          })
    );
  }
}

export type Action = {
  handler: () => Promise<any>;
};

export class TransactionManager {
  #nextId = 0;

  #transactions: Record<number, Transaction> = {};

  subscribeToTransactionState(id: number, onStateChange: () => void) {
    const transaction = this.#transactions[id];
    if (!transaction) {
      return new Failure(`Transaction ${id} not found`);
    }
    return transaction.subscribe(onStateChange);
  }

  getTransactionState(id: number) {
    const transaction = this.#transactions[id];
    if (!transaction) {
      return new Failure(`Transaction ${id} not found`);
    }
    return transaction.getState();
  }

  respondToIORequest(transactionId: number, body: any) {
    const transaction = this.#transactions[transactionId];
    if (!transaction) {
      return new Failure(`Transaction ${transactionId} not found`);
    }
    return transaction.respondToIORequest(body);
  }

  invoke(slug: string) {
    const action = this.actions[slug];
    if (!action) {
      return new Failure(`Action ${slug} not found`);
    }

    const id = this.#nextId++;

    this.#transactions[id] = new Transaction(id, action.handler);

    return { id };
  }

  constructor(public actions: Record<string, Action>) {}
}
