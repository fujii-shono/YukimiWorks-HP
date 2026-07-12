import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; dummy?: boolean }> {
  if (!apiKey) {
    console.warn('[mailer] RESEND_API_KEY が設定されていません。ダミー送信を実行します。');
    console.info('[mailer] ダミー送信内容:', options);
    return { success: true, dummy: true };
  }

  const fromName = process.env.MAIL_FROM_NAME ?? 'YukimiWorks';
  const fromDomain = process.env.MAIL_FROM_DOMAIN ?? 'yukimiworks.com';
  const from = `${fromName} <noreply@${fromDomain}>`;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    ...options,
  });

  if (error) {
    console.error('[mailer] 送信エラー:', error);
    return { success: false };
  }

  return { success: true };
}
