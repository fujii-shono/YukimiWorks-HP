import { RetroPanel } from '@/components/panels/RetroPanel';
import { WelcomeCharacter } from '@/components/welcome/WelcomeCharacter';

const defaultWelcomeCopy = [
  'YukimiWorksのホームページへようこそ。',
  '当サイトでは小さなコンテンツから大きなサービスまで、',
  'たくさんのアイデアを形にし、残しています。',
];

export function WelcomeSection({ copy = defaultWelcomeCopy }: { copy?: string[] }) {
  return (
    <RetroPanel title="Welcome" className="welcome-panel">
      <div className="welcome-content">
        <WelcomeCharacter />
        <div className="welcome-copy">
          {copy.map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>
    </RetroPanel>
  );
}
