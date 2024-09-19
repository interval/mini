import { z } from "zod";
type InputSchema = {
  state: z.ZodSchema;
  props: z.AnyZodObject;
  returns: z.ZodSchema;
};
export const INPUT_SCHEMAS = {
  INPUT_TEXT: {
    props: z.object({
      label: z.string(),
    }),
    state: z.null(),
    returns: z.string(),
  },
} satisfies Record<string, InputSchema>;

export type InputSchemas = typeof INPUT_SCHEMAS;
