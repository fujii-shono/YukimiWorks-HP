import { MessagesView } from '@/components/messages/MessagesView';
import { RetroPanel } from '@/components/panels/RetroPanel';

export default function BackAlleyMessagesPage() { return <RetroPanel title="Message" contentClassName="messages-page-body"><MessagesView includeBackAlley /></RetroPanel>; }
