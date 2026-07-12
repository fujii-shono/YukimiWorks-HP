import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeDebugPanel } from '@/components/theme/ThemeDebugPanel';
import { TimeThemeProvider } from '@/components/theme/TimeThemeProvider';

export function SiteFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimeThemeProvider>
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <div className="page-shell">
        <Header />
        <div className="layout-grid">
          <Sidebar />
          <main id="main" className="main-column">
            {children}
          </main>
        </div>
        <Footer />
      </div>
      <ThemeDebugPanel />
    </TimeThemeProvider>
  );
}
