import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  role: z.enum(['parent', 'sitter']),
  first_name: z.string().min(2, { message: 'First name is required.' }),
  last_name: z.string().min(2, { message: 'Last name is required.' }),
  date_of_birth: z.string().refine((dob) => {
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    return age >= 18;
  }, { message: 'You must be at least 18 years old.' }),
});

export const bookingRequestSchema = z.object({
  sitter_id: z.string().uuid(),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date/time.' }),
  end_time: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date/time.' }),
  children: z.array(z.string().uuid()).min(1, { message: 'Select at least one child.' }),
  special_notes: z.string().max(1000).optional(),
  pickup_required: z.boolean().default(false),
  pickup_location: z.string().max(255).optional().nullable(),
});

export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1, { message: 'Message content cannot be empty.' }).max(5000),
});
