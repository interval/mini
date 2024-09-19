import { z } from "zod";
import type { InputSchemas } from "./ioSchema";
import { AsyncLocalStorage } from "async_hooks";

export const globalActionStore = new AsyncLocalStorage<{
  makeIORequest: <T extends keyof InputSchemas>(
    methodName: T,
    props: z.infer<InputSchemas[T]["props"]>
  ) => Promise<z.infer<InputSchemas[T]["returns"]>>;
}>();
