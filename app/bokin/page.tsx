import Image from 'next/image';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

export default function BokinPage() {
  return (
    <SiteFrame>
      <RetroPanel title="Bokin" contentClassName="single-panel-body bokin-body">
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
        <p>
          ご支援いただいけると
          <br />
          非常に助かります。
        </p>
        {/* <p>
          ご支援いただいた方には
          <br />
          ささやかなお礼として
          <br />
          おみくじを提供しております。
        </p> */}
        <p>小さな運試しとしてお楽しみください。</p>
        <form action="/api/bokin/checkout" method="post" className="bokin-support-form">
          <label className="bokin-amount-field">
            <span>支援金額</span>
            <span className="bokin-amount-input-wrap">
              <input type="number" name="amount" min="50" step="1" defaultValue="50" inputMode="numeric" required />
              <span>円</span>
            </span>
          </label>
          <button type="submit" className="bokin-support-button">
            支援する
          </button>
        </form>
      </RetroPanel>
    </SiteFrame>
  );
}
