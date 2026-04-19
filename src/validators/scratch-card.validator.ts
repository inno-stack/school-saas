import { z } from "zod";

export const generateCardsSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1, "Minimum 1 card")
    .max(500, "Maximum 500 cards per batch"),

  assignedTo: z.string().optional().nullable(),
});

export const validateCardSchema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  pin: z
    .string()
    .length(12, "PIN must be exactly 12 digits")
    .regex(/^\d{12}$/, "PIN must contain only numbers"),
});

export const disableCardSchema = z.object({
  cardIds: z.array(z.string()).min(1, "At least one card ID is required"),
});

export type GenerateCardsInput = z.infer<typeof generateCardsSchema>;
export type ValidateCardInput = z.infer<typeof validateCardSchema>;
export type DisableCardInput = z.infer<typeof disableCardSchema>;
