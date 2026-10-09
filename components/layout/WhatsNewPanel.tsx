import Link from 'next/link';
import type { ComponentProps, ComponentType } from 'react';

export type WhatsNewItem = {
  id: string;
  title: string;
  date: string;
  href: string;
};

type WhatsNewPanelProps = {
  items: WhatsNewItem[];
  historyHref: string;
  LinkComponent?: ComponentType<ComponentProps<typeof Link>>;
};

export function WhatsNewPanel({ items, historyHref, LinkComponent = Link }: WhatsNewPanelProps) {
  return (
    <section className="window-panel news-panel">
      <h2 className="window-title">
        <span className="title-deco" aria-hidden="true">❄</span>
        <LinkComponent href={historyHref} className="window-title-link">What&apos;s New</LinkComponent>
        <span className="title-deco" aria-hidden="true">❄</span>
      </h2>
      <div className="sidebar-content">
        {items.length > 0 ? items.map((item) => (
          <article className="news-item" key={item.id}>
            <time dateTime={item.date}>{item.date.replaceAll('-', '/')}</time>
            <p><LinkComponent href={item.href}>{item.title}</LinkComponent></p>
          </article>
        )) : <p>更新情報はありません</p>}
        <LinkComponent className="more-link" href={historyHref}>過去の更新履歴 &raquo;</LinkComponent>
      </div>
    </section>
  );
}
