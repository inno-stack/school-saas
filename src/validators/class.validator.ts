import { z } from "zod";

export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required")
    .max(50, "Class name too long")
    .transform((val) => val.trim()),

  description: z.string().max(255).optional().nullable(),
});

export const updateClassSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .transform((val) => val.trim())
    .optional(),

  description: z.string().max(255).optional().nullable(),
});

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, "Subject name is required")
    .max(100, "Subject name too long")
    .transform((val) => val.trim()),

  code: z
    .string()
    .max(10, "Subject code too long")
    .transform((val) => val.trim().toUpperCase())
    .optional()
    .nullable(),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((val) => val.trim())
    .optional(),

  code: z
    .string()
    .max(10)
    .transform((val) => val.trim().toUpperCase())
    .optional()
    .nullable(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
