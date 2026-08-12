import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { BokinSupportForm } from '@/components/ui/BokinSupportForm';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';

const title = 'YukimiWorks 募金ページ';
const description =
  'YukimiWorksの開発・運営を継続するための支援ページです。ご支援いただいた方には、ささやかなお礼としておみくじを提供しています。';
const url = 'https://www.yukimi-works.co.jp/bokin';
const image = {
  url: 'https://www.yukimi-works.co.jp/bokin/header.png',
  width: 4000,
  height: 1000,
  alt: 'YukimiWorks 募金ページ',
};

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title,
    description,
    url,
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image],
  },
};

export default function BokinPage() {
  return (
    <SiteFrame>
      <RetroPanel title="Bokin" className="bokin-panel" contentClassName="single-panel-body bokin-body">
        <Image
          src="/bokin/header.png"
          alt="YukimiWorks 募金ページ"
          width={4000}
          height={1000}
          className="bokin-header-image"
          priority
          unoptimized
        />
        <p className="bokin-lead">いつも利用してくださる方へ</p>
        <p>このサービスを今後も継続するため、開発や運営への支援を受け付けています。</p>
        {/* <p>
          ご支援いただいけると
          <br />
          非常に助かります。
          <br />
        </p> */}
        <p>
          ご支援いただいた方には
          <br />
          ささやかなお礼として
          <br />
          おみくじを提供しております。
        </p>
        <p>小さな運試しとしてお楽しみください。</p>
        <p className="bokin-donation-note">
          ※支援金の10%は熊本震災の募金に使用します
          <br />
          （８月末までにいただいたご支援が対象）
          <br />
          <Link href="https://donation.yahoo.co.jp/detail/925104" target="_blank" rel="noopener noreferrer">
            https://donation.yahoo.co.jp/detail/925104
          </Link>
        </p>
        <BokinSupportForm />
      </RetroPanel>
    </SiteFrame>
  );
}
