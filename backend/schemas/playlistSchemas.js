import { z } from 'zod';

export const createPlaylistSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    initialTrackId: z.string().min(1).optional(),
    clip: z
      .object({
        name: z.string().optional(),
        start: z.number().min(0),
        end: z.number().min(0),
      })
      .optional(),
  }),
});

export const updatePlaylistSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    artwork: z.string().optional(),
  }),
});

export const addTrackSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    trackId: z.string().min(1),
    clip: z
      .object({
        name: z.string().optional(),
        start: z.number().min(0),
        end: z.number().min(0),
      })
      .optional(),
    clipId: z.string().optional(),
  }),
});

export const removeTrackSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    trackId: z.string().min(1),
  }),
});

export const reorderSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    entryIds: z.array(z.string()).min(1),
  }),
});

export const getPlaylistSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
