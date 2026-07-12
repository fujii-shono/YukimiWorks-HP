export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p>
        <span aria-hidden="true">❄</span> YukimiWorks <span aria-hidden="true">❄</span>
      </p>
      <small>Copyright (C) {currentYear} YukimiWorks All Rights Reserved.</small>
      <small>当サイト内の文章・画像の無断転載を禁じます。</small>
    </footer>
  );
}
