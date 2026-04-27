import { z } from "zod";

export const updateSchoolProfileSchema = z.object({
  name: z
    .string()
    .min(2, "School name must be at least 2 characters")
    .max(100)
    .optional(),

  phone: z.string().max(20).optional().nullable(),

  address: z.string().max(255).optional().nullable(),

  website: z.string().url("Invalid website URL").optional().nullable(),

  motto: z.string().max(255).optional().nullable(),

  logo: z.string().optional().nullable(),
});

export const updateSchoolSettingsSchema = z.object({
  termName: z

    .enum(["Term", "Semester"], "termName must be 'Term' or 'Semester'")
    .optional(),

  resultPin: z.boolean().optional(),

  showPosition: z.boolean().optional(),
});

export type UpdateSchoolProfileInput = z.infer<
  typeof updateSchoolProfileSchema
>;
export type UpdateSchoolSettingsInput = z.infer<
  typeof updateSchoolSettingsSchema
>;
