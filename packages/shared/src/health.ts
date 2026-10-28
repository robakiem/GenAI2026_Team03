import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("babki-api"),
  db: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
