import { SiteFrame } from '@/components/layout/SiteFrame';
import { AppServiceForm } from '@/components/ui/AppServiceForm';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { appServices } from '@/data/appServices';

export default function AppInquiryPage() {
  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/contact" className="back-link">
          &larr; お問い合わせトップへ戻る
        </Link>
        <div className="page-intro">
          <h2>アプリ・サービスに関するお問い合わせ</h2>
        </div>
        <AppServiceForm services={appServices} />
      </section>
    </SiteFrame>
  );
}
