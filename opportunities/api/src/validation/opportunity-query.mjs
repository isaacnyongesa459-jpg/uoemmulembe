import { z } from 'zod';

export const OPPORTUNITY_CATEGORIES = Object.freeze([
  'jobs',
  'scholarships',
  'fellowships',
  'grants_funding',
  'volunteering',
  'technology',
  'courses_training',
  'entrepreneurship_startups',
  'conferences_programs',
  'other',
]);

const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Expected a real calendar date in YYYY-MM-DD format.');

const optionalText = (maximum) => z.string()
  .trim()
  .max(maximum)
  .transform((value) => value || undefined)
  .optional();

const querySchema = z.object({
  q: optionalText(120),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  country: optionalText(80),
  deadlineBefore: dateString.optional(),
  remote: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export function parseOpportunityQuery(query) {
  const result = querySchema.safeParse(query);
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    };
  }
  return { success: true, data: result.data };
}
