import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

export const toggleRoleSchema = z.object({
  body: z.object({
    role: z.enum(['USER', 'ADMIN']),
  }),
});
