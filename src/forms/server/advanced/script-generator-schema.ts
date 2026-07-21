import z from "zod";

export const ScriptGeneratorSchema = z.object({
  scriptName: z.string().min(1, "Script Name is required"),
  originalScriptName: z.string().min(1, "Original Script Name is required"),
  settings: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.undefined()]),
  ),
  customSettings: z.record(
    z.object({
      type: z.enum(["string", "int", "float", "boolean"]),
      value: z.union([z.string(), z.number(), z.boolean()]),
    }),
  ),
});

export type ScriptGeneratorSchemaType = z.infer<typeof ScriptGeneratorSchema>;
