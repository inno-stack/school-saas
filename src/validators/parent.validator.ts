import { z } from "zod";

export const linkChildSchema = z.object({
  parentId: z.string().min(1, "Parent ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

export const unlinkChildSchema = z.object({
  parentId: z.string().min(1, "Parent ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

export type LinkChildInput = z.infer<typeof linkChildSchema>;
export type UnlinkChildInput = z.infer<typeof unlinkChildSchema>;
