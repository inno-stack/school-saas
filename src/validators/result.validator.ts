import { z } from "zod";

// ── Single subject score input ─────────────────────
const scoreItemSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  caScore: z
    .number()
    .min(0, "CA score cannot be negative")
    .max(40, "CA score cannot exceed 40")
    .nullable()
    .optional(),
  examScore: z
    .number()
    .min(0, "Exam score cannot be negative")
    .max(60, "Exam score cannot exceed 60")
    .nullable()
    .optional(),
});

// ── Bulk score input (multiple subjects at once) ───
export const inputScoresSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  scores: z
    .array(scoreItemSchema)
    .min(1, "At least one subject score is required"),
});

// ── Update attendance ──────────────────────────────
export const updateAttendanceSchema = z.object({
  daysOpen: z.number().int().min(0).optional(),
  daysPresent: z.number().int().min(0).optional(),
  daysAbsent: z.number().int().min(0).optional(),
  vacationDate: z.string().optional().nullable(),
  resumptionDate: z.string().optional().nullable(),
});

// ── Update comments ────────────────────────────────
export const updateCommentsSchema = z.object({
  teacherComment: z.string().max(500).optional().nullable(),
  principalComment: z.string().max(500).optional().nullable(),
  teacherName: z.string().max(100).optional().nullable(),
  principalName: z.string().max(100).optional().nullable(),
});

// ── Skill rating input ─────────────────────────────
const skillItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["PSYCHOMOTOR", "SOCIAL"]),
  rating: z
    .enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "VERY_POOR"])
    .nullable()
    .optional(),
});

export const updateSkillsSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  skills: z.array(skillItemSchema).min(1),
});

export type InputScoresInput = z.infer<typeof inputScoresSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type UpdateCommentsInput = z.infer<typeof updateCommentsSchema>;
export type UpdateSkillsInput = z.infer<typeof updateSkillsSchema>;
