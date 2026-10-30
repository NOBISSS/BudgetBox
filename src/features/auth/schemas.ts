import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(8, 'Use at least 8 characters') });
export const registerSchema = loginSchema.extend({ name: z.string().min(2, 'Add your name'), confirmPassword: z.string() }).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
