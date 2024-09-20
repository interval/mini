import { AnyZodObject, z } from "zod";
import { transactionStateSchema } from "./transactionStateSchema";

export const rpcSchema = {
  invoke_transaction: {
    params: z.object({
      slug: z.string(),
    }),
    returns: z.object({
      state: transactionStateSchema,
      transactionId: z.number(),
    }),
  },
  get_transaction_state: {
    params: z.object({
      transactionId: z.number(),
    }),
    returns: transactionStateSchema,
  },
  respond_to_io_request: {
    params: z.object({
      transactionId: z.number(),
      body: z.any(),
    }),
    returns: z.object({}),
  },
  list_available_actions: {
    params: z.object({}),
    returns: z.array(
      z.object({
        slug: z.string(),
      })
    ),
  },
  list_transactions: {
    params: z.object({}),
    returns: z.array(
      z.object({
        transactionId: z.number(),
        actionSlug: z.string(),
      })
    ),
  },
} satisfies Record<
  string,
  {
    params: AnyZodObject;
    returns: AnyZodObject | z.ZodArray<AnyZodObject>;
  }
>;

export type RpcSchema = typeof rpcSchema;

export type RpcTypes<T extends keyof typeof rpcSchema> = {
  params: z.infer<(typeof rpcSchema)[T]["params"]>;
  returns: z.infer<(typeof rpcSchema)[T]["returns"]>;
};
