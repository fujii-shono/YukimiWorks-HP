'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { appInquiryTypes, type AppService } from '@/data/appServices';
import { appInquirySchema, type AppInquiryInput } from '@/lib/validations';

export function CorporateAppInquiryForm({ services }: { services: AppService[] }) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppInquiryInput>({
    resolver: zodResolver(appInquirySchema),
    defaultValues: { service: undefined, inquiryType: undefined, email: '', message: '' },
  });

  const submit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const response = await fetch('/api/contact/app', {
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
          : 'お問い合わせを受け付けました。内容を確認のうえご連絡します。',
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
      {notice ? (
        <p className={`corporate-form-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </p>
      ) : null}
      <label>
        <span>対象サービス <strong>必須</strong></span>
        <select {...register('service')}>
          <option value="">選択してください</option>
          {services.map((service) => (
            <option key={service.value} value={service.value}>{service.label}</option>
          ))}
        </select>
        {errors.service ? <small className="corporate-field-error">{errors.service.message}</small> : null}
      </label>
      <label>
        <span>お問い合わせ種別 <strong>必須</strong></span>
        <select {...register('inquiryType')}>
          <option value="">選択してください</option>
          {appInquiryTypes.map((inquiryType) => (
            <option key={inquiryType.value} value={inquiryType.value}>{inquiryType.label}</option>
          ))}
        </select>
        {errors.inquiryType ? <small className="corporate-field-error">{errors.inquiryType.message}</small> : null}
      </label>
      <label>
        <span>メールアドレス <strong>必須</strong></span>
        <input type="email" inputMode="email" autoComplete="email" spellCheck={false} {...register('email')} />
        {errors.email ? <small className="corporate-field-error">{errors.email.message}</small> : null}
      </label>
      <label>
        <span>お問い合わせ内容 <strong>必須</strong></span>
        <textarea rows={9} {...register('message')} />
        {errors.message ? <small className="corporate-field-error">{errors.message.message}</small> : null}
      </label>
      <button type="submit" className="corporate-button" disabled={isSubmitting}>
        {isSubmitting ? '送信中…' : 'お問い合わせを送信する'}
      </button>
    </form>
  );
}
