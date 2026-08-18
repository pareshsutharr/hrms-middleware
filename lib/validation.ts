import { z } from "zod";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

const flagSchema = z.literal("true").optional();

export const attendanceQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    search: z.string().trim().max(200).optional(),
    status: z.enum(["PRESENT", "ABSENT", "INCOMPLETE", "UNKNOWN"]).optional(),
    late: flagSchema,
    earlyOut: flagSchema,
    overtime: flagSchema,
  })
  .merge(paginationQuerySchema);

export const eventsQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    userId: z.string().trim().max(50).optional(),
    employee: z.string().trim().max(200).optional(),
    entryExitType: z.coerce.number().int().optional(),
  })
  .merge(paginationQuerySchema);

export const syncAttendanceBodySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const syncEventsBodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("range"), from: isoDateSchema, to: isoDateSchema }),
  z.object({ mode: z.literal("full"), confirm: z.literal(true) }),
]);

export const cosecConfigBodySchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
});

export const frappeConfigBodySchema = z.object({
  baseUrl: z.string().trim().url().optional(),
  apiKey: z.string().trim().min(1).optional(),
  apiSecret: z.string().min(1).optional(),
});

export const emailConfigBodySchema = z.object({
  recipientEmail: z.union([z.string().trim().email(), z.literal("")]).optional(),
  frequency: z.enum(["every", "changes_and_failures", "failures_only", "off"]).optional(),
});

export const emailTestBodySchema = z.object({
  recipientEmail: z.string().trim().email(),
});
