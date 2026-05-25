import { z } from "zod";

export const ENDPOINT_PATH_REGEX = /^[a-z0-9-]+$/;
export const ENDPOINT_PATH_MESSAGE = "Path must be lowercase alphanumeric with hyphens";

export const EndpointPathSchema = z.string().regex(ENDPOINT_PATH_REGEX, ENDPOINT_PATH_MESSAGE);

export const EndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: EndpointPathSchema,
  token: z.string(),
  models: z.array(z.string()),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;

export const CreateEndpointSchema = z.object({
  name: z.string().min(1),
  path: EndpointPathSchema,
  token: z.string(),
  models: z.array(z.string()),
  enabled: z.boolean().default(true),
}).strict();

export type CreateEndpoint = z.infer<typeof CreateEndpointSchema>;
