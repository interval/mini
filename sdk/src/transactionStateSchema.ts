import { z } from "zod";

export const transactionStateSchema = z.object({
  value: z.object({
    status: z.union([
      z.literal("running"),
      z.literal("success"),
      z.literal("error"),
    ]),
    pendingIORequest: z
      .object({
        methodName: z.string(),
        props: z.record(z.string(), z.unknown()),
      })
      .nullable(),
  }),
  id: z.number(),
});

export type TransactionState = z.infer<typeof transactionStateSchema>;

export type TransactionStateValue = TransactionState["value"];
