import { z } from "zod";
import { Failure } from "./Failure";
import { globalActionStore } from "./globalStores";
import { TransactionStateManager } from "./TransactionStateManager";
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
  stateManager = new TransactionStateManager({
    status: "running",
    pendingIORequest: null,
  });

  pendingIORequest: IORequestHandler | null = null;

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
          this.stateManager.patchState(
            "pendingIORequest",
            this.pendingIORequest.request
          );
          const value = await this.pendingIORequest.promise;
          this.pendingIORequest = null;
          this.stateManager.patchState("pendingIORequest", null);
          return value;
        },
      },
      () =>
        fn()
          .then(() => {
            this.stateManager.patchState("status", "success");
          })
          .catch(() => {
            this.stateManager.patchState("status", "error");
          })
    );
  }
}
