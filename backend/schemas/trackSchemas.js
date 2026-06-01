import { z } from 'zod';

export const getTracksSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    genre: z.string().optional(),
  }),
});

export const getTrackSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const deleteTrackSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
