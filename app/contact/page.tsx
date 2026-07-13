import Link from 'next/link';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { siteLinks } from '@/data/links';

const hubItems = [
  {
    title: 'ご意見・ご要望',
    description: 'YukimiWorksへのご意見・ご要望はこちら',
    href: '/contact/inquiry',
  },
  {
    title: 'アプリ・サービスに関するお問い合わせ',
    description: 'YukimiWorksのアプリ・サービスへのご質問・ご要望はこちら',
    href: '/contact/app',
  },
];

export default function ContactHubPage() {
  const supportLinks = siteLinks.filter((link) => link.supportContact);

  return (
    <SiteFrame>
      <RetroPanel title="お問い合わせ / Contact" contentClassName="single-panel-body contact-hub-body">
        <div className="contact-hub-list">
          {hubItems.map((item) => (
            <Link key={item.href} href={item.href} className="contact-hub-link">
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ))}
        </div>
        <div className="support-links">
          <h3>その他連絡先</h3>
          <div className="support-links-row">
            {supportLinks.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </RetroPanel>
    </SiteFrame>
  );
}
