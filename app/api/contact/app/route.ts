import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { escapeHtml } from '@/lib/format';
import { appInquirySchema } from '@/lib/validations';

export async function POST(req: Request) {
  const to = process.env.CONTACT_TO_APP;
  if (!to) {
    console.error('[contact/app] CONTACT_TO_APP が設定されていません。');
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  const json = await req.json();
  const parsed = appInquirySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: '入力内容を確認してください。' }, { status: 400 });
  }

  const { service, email, message } = parsed.data;
  const result = await sendMail({
    to,
    subject: `【アプリお問い合わせ】${service} へのお問い合わせ`,
    html: `
      <p><strong>対象サービス:</strong> ${escapeHtml(service)}</p>
      <p><strong>メール:</strong> ${escapeHtml(email)}</p>
      <p><strong>お問い合わせ内容:</strong><br>${escapeHtml(message)}</p>
    `,
  });

  if (!result.success) {
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({
    message: result.dummy
      ? '[DUMMY] メール送信はスキップされました（RESEND_API_KEY 未設定）。フォームデータはコンソールを確認してください。'
      : '送信を受け付けました。ありがとうございます。',
    dummy: result.dummy ?? false,
  });
}
