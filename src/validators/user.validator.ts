import { z } from "zod";

// ── Shared password rule ───────────────────────────
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

// ── Create Teacher ─────────────────────────────────
export const createTeacherSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  photo: z.string().url("Invalid photo URL").optional().nullable(),
});

// ── Create Parent ──────────────────────────────────
export const createParentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  photo: z.string().url("Invalid photo URL").optional().nullable(),
});

// ── Update User (shared for both) ──────────────────
export const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  photo: z.string().url("Invalid photo URL").optional().nullable(),
});

// ── Change Password ────────────────────────────────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type CreateParentInput = z.infer<typeof createParentSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
