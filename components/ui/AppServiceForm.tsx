'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { FormModal } from '@/components/ui/FormModal';
import type { AppService } from '@/data/appServices';
import { appInquirySchema, type AppInquiryInput } from '@/lib/validations';

export function AppServiceForm({ services }: { services: AppService[] }) {
  const [modal, setModal] = useState<{ title: string; message: string; reset?: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { triggerDebugSprite } = useTimeTheme();
  const {
    register,
    handleSubmit,
    getValues,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppInquiryInput>({
    resolver: zodResolver(appInquirySchema),
    defaultValues: { service: '', email: '', message: '' },
  });

  const submitForm = handleSubmit(async (values) => {
    setFormError(null);
    const response = await fetch('/api/contact/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = (await response.json()) as { message?: string; dummy?: boolean };
    if (!response.ok) {
      setFormError('送信に失敗しました。再送信しても改善しない場合は下記のその他連絡先からご連絡ください。');
      return;
    }
    if (data.dummy) {
      setModal({
        title: '[開発用ダミーモード]',
        message:
          'RESEND_API_KEY が設定されていないため、メールは送信されませんでした。送信内容はブラウザのコンソールおよびサーバーログに出力されています。',
        reset: true,
      });
      return;
    }
    setModal({
      title: '送信完了',
      message: 'メール送信が完了しました。返信をお待ちください。',
      reset: true,
    });
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (getValues('email').trim().toLowerCase() === 'debug') {
      event.preventDefault();
      setFormError(null);
      clearErrors('email');
      triggerDebugSprite();
      return;
    }

    void submitForm(event);
  };

  return (
    <>
      <form className="contact-form" onSubmit={onSubmit} noValidate>
        {formError ? <p className="form-global-error">{formError}</p> : null}
        <label>
          対象サービス
          <select {...register('service')}>
            <option value="">選択してください</option>
            {services.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>
          {errors.service ? <span className="field-error">{errors.service.message}</span> : null}
        </label>
        <label>
          メールアドレス
          <input type="text" inputMode="email" autoComplete="email" spellCheck={false} {...register('email')} />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>
        <label>
          お問い合わせ内容
          <textarea rows={8} {...register('message')} />
          {errors.message ? <span className="field-error">{errors.message.message}</span> : null}
        </label>
        <div className="form-submit">
          <button type="submit" className="pixel-button" disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
        </div>
      </form>
      <FormModal
        open={!!modal}
        title={modal?.title ?? ''}
        message={modal?.message ?? ''}
        onClose={() => {
          if (modal?.reset) reset();
          setModal(null);
        }}
      />
    </>
  );
}
