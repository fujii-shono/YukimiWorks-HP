import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .min(1, 'メールアドレスを入力してください。')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'メールアドレスを正しく入力してください。');

export const inquirySchema = z.object({
  email: emailField,
  name: z.string().optional(),
  nameKana: z.string().optional(),
  message: z.string().min(1, 'ご依頼内容を入力してください。'),
});

export const appInquirySchema = z.object({
  service: z.string().min(1, '対象サービスを選択してください。'),
  email: emailField,
  message: z.string().min(1, 'お問い合わせ内容を入力してください。'),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type AppInquiryInput = z.infer<typeof appInquirySchema>;
