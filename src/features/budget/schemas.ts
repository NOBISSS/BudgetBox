import { z } from 'zod';
export const budgetSchema = z.object({ income: z.number().nonnegative(), bills: z.number().nonnegative(), food: z.number().nonnegative(), transport: z.number().nonnegative(), subscriptions: z.number().nonnegative(), miscellaneous: z.number().nonnegative() });
