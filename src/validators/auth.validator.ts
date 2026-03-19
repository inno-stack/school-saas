import { z } from "zod";

export const registerSchoolSchema = z.object({
  schoolName: z
    .string()
    .min(2, "School name must be at least 2 characters")
    .max(100),

  schoolEmail: z.string().email("Invalid school email"),

  schoolPhone: z.string().optional(),

  schoolAddress: z.string().optional(),

  adminFirstName: z.string().min(2, "First name must be at least 2 characters"),

  adminLastName: z.string().min(2, "Last name must be at least 2 characters"),

  adminEmail: z.string().email("Invalid admin email"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
