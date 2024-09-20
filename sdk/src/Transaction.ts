import { z } from "zod";
import { Failure } from "./Failure";
import { globalActionStore } from "./globalStores";
import { INPUT_SCHEMAS, InputSchemas } from "./ioSchema";

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

export class Transaction {
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

  constructor(fn: () => Promise<void>) {
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
