import { z } from 'zod';
import { appInquiryTypeValues, appServiceValues } from '@/data/appServices';

const emailField = z
  .string()
  .trim()
  .min(1, 'メールアドレスを入力してください。')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'メールアドレスを正しく入力してください。');

export const inquirySchema = z.object({
  email: emailField,
  name: z.string().optional(),
  nameKana: z.string().optional(),
  message: z.string().min(1, '内容を入力してください。'),
  inquiryType: z.enum(['development', 'general']).optional(),
});

export const appInquirySchema = z.object({
  service: z.enum(appServiceValues, {
    errorMap: () => ({ message: '対象サービスを選択してください。' }),
  }),
  inquiryType: z.enum(appInquiryTypeValues, {
    errorMap: () => ({ message: 'お問い合わせ種別を選択してください。' }),
  }),
  email: emailField,
  message: z.string().min(1, 'お問い合わせ内容を入力してください。'),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
export type AppInquiryInput = z.infer<typeof appInquirySchema>;
