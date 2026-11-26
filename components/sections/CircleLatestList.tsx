'use client';

import Image from 'next/image';
import { useState } from 'react';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { cn } from '@/lib/format';

export type CircleLatestItem = {
  id: string;
  href: string;
  title: string;
  image: { src: string; alt: string };
};

export function CircleLatestList({ items }: { items: CircleLatestItem[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={cn('circle-latest-list', expanded && 'is-expanded')}>
        {items.map((item) => (
          <Link href={item.href} className="circle-latest-tile" key={item.id}>
            <span className="circle-latest-image-frame">
              <Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 767px) 30vw, 168px" className="circle-latest-image" unoptimized />
            </span>
            <strong title={item.title}>{item.title}</strong>
          </Link>
        ))}
      </div>
      {items.length > 8 ? (
        <button type="button" className="pixel-button circle-latest-more circle-latest-more-desktop" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? '表示を戻す' : '続きを表示'}
        </button>
      ) : null}
      {items.length > 3 ? (
        <button type="button" className="pixel-button circle-latest-more circle-latest-more-mobile" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? '表示を戻す' : '続きを表示'}
        </button>
      ) : null}
    </>
  );
}
