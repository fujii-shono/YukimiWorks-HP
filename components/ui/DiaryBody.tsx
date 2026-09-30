import { RichBody } from '@/components/ui/RichBody';
import type { DiaryBodySegment } from '@/data/diary';

export async function DiaryBody({ body }: { body: DiaryBodySegment[] | string }) {
  return <RichBody body={body} />;
}
