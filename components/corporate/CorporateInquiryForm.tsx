'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { inquirySchema, type InquiryInput } from '@/lib/validations';

type CorporateInquiryFormProps = {
  type?: 'development' | 'general';
};

export function CorporateInquiryForm({ type = 'development' }: CorporateInquiryFormProps) {
  const isDevelopmentInquiry = type === 'development';
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { email: '', name: '', nameKana: '', message: '', inquiryType: type },
  });

  const submit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const response = await fetch('/api/contact/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => null)) as { dummy?: boolean } | null;
      if (!response.ok) throw new Error('request failed');
      setNotice({
        type: 'success',
        message: data?.dummy
          ? '開発環境のためメールは送信されていませんが、入力内容は正常に受け付けました。'
          : `${isDevelopmentInquiry ? 'ご相談' : 'お問い合わせ'}を受け付けました。内容を確認のうえご連絡します。`,
      });
      reset();
    } catch {
      setNotice({
        type: 'error',
        message: '送信できませんでした。時間を置いて再度お試しください。',
      });
    }
  });

  return (
    <form className="corporate-inquiry-form" onSubmit={(event) => void submit(event)} noValidate>
      <input type="hidden" {...register('inquiryType')} />
      {notice ? (
        <p className={`corporate-form-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </p>
      ) : null}
      <div className="corporate-form-grid">
        <label>
          <span>お名前・会社名</span>
          <input type="text" autoComplete="organization" {...register('name')} />
        </label>
        <label>
          <span>ふりがな</span>
          <input type="text" {...register('nameKana')} />
        </label>
      </div>
      <label>
        <span>メールアドレス <strong>必須</strong></span>
        <input type="email" inputMode="email" autoComplete="email" spellCheck={false} {...register('email')} />
        {errors.email ? <small className="corporate-field-error">{errors.email.message}</small> : null}
      </label>
      <label>
        <span>{isDevelopmentInquiry ? 'ご相談内容' : 'お問い合わせ内容'} <strong>必須</strong></span>
        <textarea
          rows={9}
          placeholder={isDevelopmentInquiry ? '現在困っていること、作りたいもの、希望時期など、分かる範囲でお書きください。' : undefined}
          {...register('message')}
        />
        {errors.message ? <small className="corporate-field-error">{errors.message.message}</small> : null}
      </label>
      <button type="submit" className="corporate-button" disabled={isSubmitting}>
        {isSubmitting ? '送信中…' : `${isDevelopmentInquiry ? '相談内容' : 'お問い合わせ'}を送信する`}
      </button>
    </form>
  );
}
