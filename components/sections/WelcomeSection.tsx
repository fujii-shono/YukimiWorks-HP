import { RetroPanel } from '@/components/panels/RetroPanel';
import { WelcomeCharacter } from '@/components/welcome/WelcomeCharacter';

export function WelcomeSection() {
  return (
    <RetroPanel title="Welcome" className="welcome-panel">
      <div className="welcome-content">
        <WelcomeCharacter />
        <div className="welcome-copy">
          <p>YukimiWorksのホームページへようこそ。</p>
          <p>当サイトでは小さなコンテンツから大きなサービスまで、</p>
          <p>たくさんのアイデアを形にし、残しています。</p>
        </div>
      </div>
    </RetroPanel>
  );
}
