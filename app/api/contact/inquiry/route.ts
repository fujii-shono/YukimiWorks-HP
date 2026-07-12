import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { escapeHtml } from '@/lib/format';
import { inquirySchema } from '@/lib/validations';

export async function POST(req: Request) {
  const to = process.env.CONTACT_TO_INQUIRY;
  if (!to) {
    console.error('[contact/inquiry] CONTACT_TO_INQUIRY が設定されていません。');
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  const json = await req.json();
  const parsed = inquirySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: '入力内容を確認してください。' }, { status: 400 });
  }

  const { email, name, nameKana, message } = parsed.data;
  const result = await sendMail({
    to,
    subject: `【仕事のご依頼】${name || email} 様よりお問い合わせ`,
    html: `
      <p><strong>メール:</strong> ${escapeHtml(email)}</p>
      <p><strong>お名前・会社名:</strong> ${escapeHtml(name || '（未入力）')}</p>
      <p><strong>ふりがな:</strong> ${escapeHtml(nameKana || '（未入力）')}</p>
      <p><strong>ご依頼内容:</strong><br>${escapeHtml(message)}</p>
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
