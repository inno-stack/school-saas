import { z } from "zod";

export const createSessionSchema = z.object({
  name: z
    .string()
    .min(1, "Session name is required")
    .max(20, "Session name too long")
    .regex(
      /^\d{4}\/\d{4}$/,
      "Session name must be in format YYYY/YYYY e.g. 2025/2026",
    )
    .refine((val) => {
      const [start, end] = val.split("/").map(Number);
      return end === start + 1;
    }, "End year must be exactly one year after start year"),
});

export const updateSessionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(20)
    .regex(
      /^\d{4}\/\d{4}$/,
      "Session name must be in format YYYY/YYYY e.g. 2025/2026",
    )
    .refine((val) => {
      const [start, end] = val.split("/").map(Number);
      return end === start + 1;
    }, "End year must be exactly one year after start year")
    .optional(),
});

export const createTermSchema = z.object({
  name: z.enum(
    ["FIRST", "SECOND", "THIRD"], 
    { message: "Term name must be FIRST, SECOND, or THIRD" }
  ),
  });

export const updateTermSchema = z.object({
  name: z
    .enum(
      ["FIRST", "SECOND", "THIRD"], 
      "Term name must be FIRST, SECOND, or THIRD" // Simple string is safer for TS
    )
    .optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateTermInput = z.infer<typeof createTermSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
