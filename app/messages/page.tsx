import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { MessagesView } from '@/components/messages/MessagesView';
import { RetroPanel } from '@/components/panels/RetroPanel';

export const metadata: Metadata = {
  title: 'Message | YukimiWorks',
  description: 'YukimiWorksからのメッセージ、メディア、支援情報をご覧いただけます。',
};

export default function MessagesPage() {
  return (
    <SiteFrame>
      <RetroPanel title="Message" contentClassName="messages-page-body">
        <MessagesView />
      </RetroPanel>
    </SiteFrame>
  );
}
