import { z } from "zod";

export const EndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().regex(/^\/[a-z0-9-]+$/),
  token: z.string(),
  models: z.array(z.string()),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;

export const CreateEndpointSchema = z.object({
  name: z.string().min(1),
  path: z.string().regex(/^\/[a-z0-9-]+$/),
  token: z.string(),
  models: z.array(z.string()),
  enabled: z.boolean().default(true),
}).strict();

export type CreateEndpoint = z.infer<typeof CreateEndpointSchema>;
