export const baseWelcomeMessages = [
  'いらっしゃいませ',
  'こんにちは',
  '何かご用ですか',
  'ゆっくり見ていってください',
  '色々あります',
  '新しい作品が追加されました',
  'ご機嫌いかが',
] as const;

export const timeBasedMessages = {
  earlyMorning: ['おはようございます', '今日も頑張ります', 'まだ眠い'],
  day: ['お腹空いた', 'お昼休みです', 'ちょっと休憩'],
  snackHour: ['ちょっと休憩', 'おやつの時間', 'サボり中です', '筋トレでもしよう'],
  evening: ['今日もお疲れ様', 'もう夕方です', '夕ご飯の準備をしないと', '今日のご飯は何にしようかな'],
  night: ['こんばんは', '夜ですね', 'もうこんな時間'],
  lateNight: ['そろそろ眠くなってきた'],
  sleeping: ['ZZZ'],
} as const;

export const clickMessageTable = {
  warning: [
    { max: 20, message: '怒りますよ' },
    { max: 55, message: 'あまりつつかないでください' },
    { max: 100, message: '困りますお客様' },
  ],
  bored: [{ max: 60, message: 'あなたも暇ですね' }],
} as const;

export const absentMessage = 'お出かけ中';
export const peekMessage = 'お取り込み中です！';
