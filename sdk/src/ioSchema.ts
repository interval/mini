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
      helpText: z.optional(z.string()),
      placeholder: z.optional(z.string()),
      defaultValue: z.optional(z.string()).nullable(),
      multiline: z.optional(z.boolean()),
      lines: z.optional(z.number()),
      minLength: z.optional(z.number().int().positive()),
      maxLength: z.optional(z.number().int().positive()),
      disabled: z.optional(z.boolean().default(false)),
    }),
    state: z.null(),
    returns: z.string(),
  },
  INPUT_NUMBER: {
    props: z.object({
      label: z.string(),
      min: z.optional(z.number().int().positive()),
      max: z.optional(z.number().int().positive()),
    }),
    state: z.null(),
    returns: z.number(),
  },
} satisfies Record<string, InputSchema>;

export type InputSchemas = typeof INPUT_SCHEMAS;

export type InputTypes<T extends keyof InputSchemas> = {
  props: z.infer<InputSchemas[T]["props"]>;
  returns: z.infer<InputSchemas[T]["returns"]>;
};
