import { z } from "zod";

export const AuthTokenSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  tokenHash: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

export const CreateAuthTokenSchema = z.object({
  name: z.string().min(1),
  tokenHash: z.string(),
  lastUsedAt: z.date().optional(),
}).strict();

export type CreateAuthToken = z.infer<typeof CreateAuthTokenSchema>;
