import Link from 'next/link';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { InquiryForm } from '@/components/ui/InquiryForm';

export default function InquiryPage() {
  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/contact" className="back-link">
          &larr; お問い合わせトップへ戻る
        </Link>
        <div className="page-intro">
          <h2>仕事のご依頼</h2>
        </div>
        <InquiryForm />
      </section>
    </SiteFrame>
  );
}
