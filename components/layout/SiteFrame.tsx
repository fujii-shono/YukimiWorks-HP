import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DebugSpriteHost } from '@/components/theme/DebugSpriteHost';
import { SleepWarningRouteGuard } from '@/components/theme/SleepWarningRouteGuard';
import { ThemeDebugPanel } from '@/components/theme/ThemeDebugPanel';
import { TimeThemeProvider } from '@/components/theme/TimeThemeProvider';

export function SiteFrame({
  children,
  hideSidebar = false,
  homeHref = '/circle',
  siteTitle = '溶けたアイス',
  siteEyebrow = '同人サークル',
}: {
  children: React.ReactNode;
  hideSidebar?: boolean;
  homeHref?: string;
  siteTitle?: string;
  siteEyebrow?: string;
}) {
  return (
    <TimeThemeProvider>
      <SleepWarningRouteGuard />
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <div className="page-shell">
        <Header homeHref={homeHref} title={siteTitle} eyebrow={siteEyebrow} />
        {hideSidebar ? (
          <main id="main" className="main-column standalone-main">
            {children}
          </main>
        ) : (
          <div className="layout-grid">
            <Sidebar />
            <main id="main" className="main-column">
              {children}
            </main>
          </div>
        )}
        <Footer />
      </div>
      <DebugSpriteHost />
      <ThemeDebugPanel />
    </TimeThemeProvider>
  );
}
