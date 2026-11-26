import Image from 'next/image';
import Link from 'next/link';

const navigation = [
  { href: '/#business', label: '事業内容' },
  { href: '/products', label: '自社プロダクト' },
  { href: '/kakaritsuke', label: 'かかりつけ開発室' },
  { href: '/about', label: '会社情報' },
] as const;

export function CorporateLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="corporate-site">
      <a className="corporate-skip-link" href="#corporate-main">
        本文へ移動
      </a>
      <header className="corporate-header">
        <div className="corporate-header-inner">
          <Link href="/" className="corporate-brand" aria-label="YukimiWorks 企業トップへ">
            <Image src="/brand/yukimi-works.svg" alt="" width={46} height={46} priority />
            <span>YukimiWorks</span>
          </Link>
          <nav className="corporate-nav" aria-label="企業サイトメニュー">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="corporate-nav-cta">
              お問い合わせ
            </Link>
          </nav>
          <div className="corporate-mobile-header-actions">
            <Link href="/contact" className="corporate-mobile-contact">
              お問い合わせ
            </Link>
            <details className="corporate-mobile-menu">
              <summary>
                <span className="corporate-hamburger-icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="visually-hidden">メニュー</span>
              </summary>
              <nav className="corporate-mobile-menu-panel" aria-label="企業サイトモバイルメニュー">
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="corporate-main">{children}</main>
      <footer className="corporate-footer">
        <div className="corporate-container corporate-footer-grid">
          <div>
            <Link href="/" className="corporate-brand corporate-footer-brand">
              <Image src="/brand/yukimi-works.svg" alt="" width={40} height={40} />
              <span>YukimiWorks</span>
            </Link>
          </div>
          <nav aria-label="フッターメニュー">
            <Link href="/products">自社プロダクト</Link>
            <Link href="/kakaritsuke">かかりつけ開発室</Link>
            <Link href="/about">会社情報</Link>
            <Link href="/contact">お問い合わせ</Link>
            <Link href="/circle">サークル活動</Link>
          </nav>
        </div>
        <div className="corporate-container corporate-footer-bottom">
          <small>&copy; {currentYear} YukimiWorks</small>
        </div>
      </footer>
    </div>
  );
}
