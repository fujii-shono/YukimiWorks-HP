'use client';

import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { getXTrafficDetail, getXTrafficStats } from '@/lib/analytics/client';
import type { TrackingLinkStats, TrackingTrafficDetail, TrafficGranularity, TrafficPoint } from '@/lib/analytics/types';

function tokyoAnchor(granularity: TrafficGranularity) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    ...(granularity === 'daily' ? { day: '2-digit' } : {}),
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return granularity === 'daily' ? `${values.year}-${values.month}-${values.day}` : `${values.year}-${values.month}`;
}

function shiftAnchor(anchor: string, granularity: TrafficGranularity, direction: -1 | 1) {
  if (granularity === 'daily') {
    const date = new Date(`${anchor}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + direction * 30);
    return date.toISOString().slice(0, 10);
  }
  const [year, month] = anchor.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + direction * 12, 1));
  return date.toISOString().slice(0, 7);
}

function trendLabel(points: TrafficPoint[]) {
  const previous = points.at(-2)?.visitors || 0;
  const current = points.at(-1)?.visitors || 0;
  if (current > previous) return '伸びている';
  if (current < previous) return '減っている';
  return '安定している';
}

function TrafficChart({ points, label }: { points: TrafficPoint[]; label: string }) {
  const max = Math.max(1, ...points.map((point) => point.visitors));
  const width = 720;
  const height = 190;
  const baseline = 155;
  const gap = width / points.length;
  const barWidth = Math.max(4, gap - 4);
  return (
    <div className="traffic-chart-wrap">
      <svg className="traffic-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}の訪問者数推移`}>
        <line x1="0" y1={baseline} x2={width} y2={baseline} className="traffic-chart-axis" />
        {points.map((point, index) => {
          const barHeight = (point.visitors / max) * 125;
          return (
            <g key={point.period}>
              <rect x={index * gap + (gap - barWidth) / 2} y={baseline - barHeight} width={barWidth} height={barHeight} className="traffic-chart-bar">
                <title>{point.period}: {point.visitors}人</title>
              </rect>
              {(index === 0 || index === points.length - 1 || (points.length <= 12 && index % 2 === 0)) ? (
                <text x={index * gap + gap / 2} y="177" textAnchor="middle" className="traffic-chart-label">
                  {points.length > 12 ? point.period.slice(5) : point.period}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ul className="visually-hidden">
        {points.map((point) => <li key={point.period}>{point.period}: {point.visitors}人</li>)}
      </ul>
    </div>
  );
}

export function AdminTrafficAnalytics({ onBack }: { onBack: () => void }) {
  const { firebaseUser } = useFirebaseAuth();
  const [links, setLinks] = useState<TrackingLinkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackingLinkStats | null>(null);
  const [granularity, setGranularity] = useState<TrafficGranularity>('daily');
  const [anchor, setAnchor] = useState(() => tokyoAnchor('daily'));
  const [detail, setDetail] = useState<TrackingTrafficDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    setLoading(true);
    void getXTrafficStats(firebaseUser)
      .then((nextLinks) => {
        if (active) setLinks(nextLinks);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'アクセス分析を読み込めませんでした。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || !selectedLink) return;
    let active = true;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    void getXTrafficDetail(firebaseUser, selectedLink.token, granularity, anchor)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((loadError) => {
        if (active) setDetailError(loadError instanceof Error ? loadError.message : '詳細を読み込めませんでした。');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [anchor, firebaseUser, granularity, selectedLink]);

  useEffect(() => {
    if (!selectedLink) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLink(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedLink]);

  const openDetail = (link: TrackingLinkStats) => {
    setGranularity('daily');
    setAnchor(tokyoAnchor('daily'));
    setSelectedLink(link);
  };

  const changeGranularity = (nextGranularity: TrafficGranularity) => {
    setGranularity(nextGranularity);
    setAnchor(tokyoAnchor(nextGranularity));
  };

  const maxAnchor = tokyoAnchor(granularity);

  return (
    <div className="admin-traffic-analytics">
      <div className="admin-subpage-header">
        <h2>アクセス分析</h2>
        <button type="button" onClick={onBack}>管理項目へ戻る</button>
      </div>
      <p className="traffic-analytics-note">人数は匿名Cookieによるブラウザ単位の概算です。同じ期間内の再訪問と主要なBotは除外します。</p>
      {loading ? <p>分析データを読み込んでいます…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!loading && !error && links.length === 0 ? <p>計測リンクはまだありません。</p> : null}
      <div className="traffic-link-list">
        {links.map((link) => (
          <article className="traffic-link-card" key={link.token}>
            <header>
              <div>
                <p className="traffic-link-message">{link.messageBody || '投稿前または投稿との関連付け前のリンク'}</p>
                <a href={link.destinationUrl} target="_blank" rel="noopener noreferrer">{link.destinationUrl}</a>
                <p className="traffic-tracking-url">計測URL: {link.trackingUrl}</p>
              </div>
              <p className="traffic-total"><strong>{link.totalVisitors}</strong><span>人訪問</span></p>
            </header>
            <button type="button" className="traffic-details-button" onClick={() => openDetail(link)}>詳細を見る</button>
          </article>
        ))}
      </div>

      {selectedLink ? (
        <div className="traffic-modal-backdrop" onMouseDown={() => setSelectedLink(null)}>
          <section className="traffic-modal" role="dialog" aria-modal="true" aria-labelledby="traffic-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="traffic-modal-heading">
              <h2 id="traffic-modal-title">アクセス詳細</h2>
              <button type="button" className="traffic-modal-close" onClick={() => setSelectedLink(null)} autoFocus aria-label="閉じる">×</button>
            </div>
            <p className="traffic-modal-link">{selectedLink.destinationUrl}</p>
            <div className="traffic-granularity-toggle" aria-label="集計単位">
              <button type="button" aria-pressed={granularity === 'daily'} onClick={() => changeGranularity('daily')}>日別</button>
              <button type="button" aria-pressed={granularity === 'monthly'} onClick={() => changeGranularity('monthly')}>月別</button>
            </div>
            <div className="traffic-period-controls">
              <button type="button" aria-label="前の期間" onClick={() => setAnchor(shiftAnchor(anchor, granularity, -1))} disabled={detailLoading}>◀</button>
              <label>
                <span>{granularity === 'daily' ? '終了日を指定' : '終了月を指定'}</span>
                <input type={granularity === 'daily' ? 'date' : 'month'} value={anchor} max={maxAnchor} onChange={(event) => setAnchor(event.target.value)} />
              </label>
              <button type="button" aria-label="次の期間" onClick={() => setAnchor(shiftAnchor(anchor, granularity, 1))} disabled={detailLoading || anchor >= maxAnchor}>▶</button>
            </div>
            {detailLoading ? <p>詳細を読み込んでいます…</p> : null}
            {detailError ? <p className="form-error" role="alert">{detailError}</p> : null}
            {detail ? (
              <section className="traffic-modal-chart">
                <div>
                  <h3>{granularity === 'daily' ? '日別訪問者数' : '月別訪問者数'}</h3>
                  <p>{detail.rangeStart} 〜 {detail.rangeEnd}</p>
                </div>
                <p className="traffic-trend">直前の{granularity === 'daily' ? '日' : '月'}比: {trendLabel(detail.points)}</p>
                <TrafficChart points={detail.points} label={granularity === 'daily' ? '日別' : '月別'} />
              </section>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
