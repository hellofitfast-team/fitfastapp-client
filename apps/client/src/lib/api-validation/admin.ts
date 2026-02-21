import { z } from 'zod';

/**
 * Schema for OCR request input validation.
 * Used by /api/admin/ocr route.
 */
export const OcrRequestSchema = z
  .object({
    imageBase64: z.string().optional(),
    imageUrl: z.string().url().optional(),
    signupId: z.string().uuid().optional(),
  })
  .refine((data) => data.imageBase64 || data.imageUrl, {
    message: 'Provide imageBase64 or imageUrl',
  });

export type OcrRequestInput = z.infer<typeof OcrRequestSchema>;

/**
 * Schema for OCR result validation.
 * Validates AI output before database save.
 * Used by /api/admin/ocr route (ADMIN-02).
 */
export const OcrResultSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number')
      .optional(),
    sender_name: z.string().min(1).max(100).optional(),
    reference_number: z.string().min(1).max(50).optional(),
    date: z.string().optional(),
    bank: z.string().min(1).max(50).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be extracted',
  });

export type OcrResultOutput = z.infer<typeof OcrResultSchema>;

/**
 * Schema for approving signups.
 * Used by /api/admin/approve-signup route.
 */
export const ApproveSignupSchema = z.object({
  signupId: z.string().uuid('Invalid signup ID'),
});

export type ApproveSignupInput = z.infer<typeof ApproveSignupSchema>;

/**
 * Schema for sending notifications to users.
 * Used by /api/admin/send-notification route.
 */
export const SendNotificationSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    message: z.string().min(1, 'Message is required').max(1000),
    user_ids: z.array(z.string().uuid()).optional(),
    send_to_all: z.boolean().optional().default(false),
  })
  .refine(
    (data) => data.send_to_all || (data.user_ids && data.user_ids.length > 0),
    {
      message: 'Either send_to_all must be true or user_ids must be provided',
    }
  );

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
