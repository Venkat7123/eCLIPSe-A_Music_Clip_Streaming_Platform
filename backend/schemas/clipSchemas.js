import { z } from 'zod';

export const createClipSchema = z.object({
  body: z.object({
    trackId: z.string().min(1),
    name: z.string().max(100).optional(),
    start: z.number().min(0),
    end: z.number().min(0),
  }),
});

export const updateClipSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().max(100).optional(),
    start: z.number().min(0).optional(),
    end: z.number().min(0).optional(),
  }),
});

export const getClipSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const deleteClipSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
