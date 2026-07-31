import { redirect } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { saveBokinSupportMessage } from '@/lib/bokinMessages';

export const dynamic = 'force-dynamic';

type StripeCheckoutSession = {
  id: string;
  amount_total: number | null;
  currency: string | null;
  metadata?: {
    kind?: string;
    amount?: string;
    displayName?: string;
  } | null;
  payment_status: string;
  status: string | null;
  created: number;
};

const omikujiResults = [
  {
    label: '大吉',
    message: '今日のひらめきは、思ったより遠くまで届きそうです。',
  },
  {
    label: '中吉',
    message: '小さく始めたことが、いい形で育っていきます。',
  },
  {
    label: '小吉',
    message: '焦らず整えるほど、あとで気持ちよく進めます。',
  },
  {
    label: '吉',
    message: '何気ない選択が、やさしい追い風になります。',
  },
] as const;

function chooseOmikuji(sessionId: string) {
  const hash = Array.from(sessionId).reduce((total, char) => total + char.charCodeAt(0), 0);
  return omikujiResults[hash % omikujiResults.length];
}

async function getPaidDonationSession(sessionId: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const session = (await response.json()) as StripeCheckoutSession;
  if (session.metadata?.kind !== 'bokin') return null;
  if (session.payment_status !== 'paid') return null;
  if (session.status !== 'complete') return null;
  return session;
}

export default async function BokinThanksPage({
  searchParams,
}: {
  searchParams: {
    session_id?: string;
  };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) redirect('/bokin');

  const session = await getPaidDonationSession(sessionId);
  if (!session) redirect('/bokin');

  const omikuji = chooseOmikuji(session.id);
  const amount = session.amount_total ?? 0;
  try {
    await saveBokinSupportMessage({
      sessionId: session.id,
      amount,
      displayName: session.metadata?.displayName,
      createdAt: session.created,
    });
  } catch (error) {
    console.error('[bokin/thanks] 支援メッセージの保存に失敗しました。', error);
  }

  return (
    <SiteFrame>
      <RetroPanel title="Thanks" contentClassName="single-panel-body bokin-thanks-body">
        <p className="bokin-lead">ご支援ありがとうございます！</p>
        <p>{amount > 0 ? `${amount.toLocaleString('ja-JP')}円のご支援を受け付けました。` : 'ご支援を受け付けました。'}</p>
        <div className="bokin-omikuji" aria-label="おみくじ結果">
          <p className="bokin-omikuji-label">{omikuji.label}</p>
          <p>{omikuji.message}</p>
        </div>
        <Link href="/bokin" className="bokin-return-link">
          募金ページへ戻る
        </Link>
      </RetroPanel>
    </SiteFrame>
  );
}
