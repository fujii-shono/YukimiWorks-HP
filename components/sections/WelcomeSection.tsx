import { RetroPanel } from '@/components/panels/RetroPanel';
import { WelcomeCharacter } from '@/components/welcome/WelcomeCharacter';

const defaultWelcomeCopy = [
  'サークル「溶けたアイス」へようこそ',
  'イベント参加・グッズ・ゲーム制作の情報をまとめています',
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
