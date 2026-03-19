import { z } from "zod";

export const createStudentSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50),

  middleName: z.string().max(50).optional().nullable(),

  gender: z.enum(["MALE", "FEMALE"], {
    errorMap: () => ({ message: "Gender must be MALE or FEMALE" }),
  }),

  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth"),

  photo: z.string().url("Invalid photo URL").optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  middleName: z.string().max(50).optional().nullable(),
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date of birth"),
  photo: z.string().url("Invalid photo URL").optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "GRADUATED", "TRANSFERRED", "SUSPENDED"])
    .optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
