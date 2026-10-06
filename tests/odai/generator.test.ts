import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOdaiHashtags, buildWeeklyOdaiXPost, generateOdai } from '../../lib/odai/generator';
import { getOdaiWeekWindow } from '../../lib/odai/week';
import { getWeeklyOdaiXPostingMode } from '../../lib/odai/x-posting';

const source = [
  { category: 'ポーズ', items: ['ピース', 'ダブルピース'] },
  { category: '服装', items: ['パーカー'] },
  { category: '小物', items: ['スマホ'] },
  { category: 'キャラクター', items: ['魔女'] },
];

function randomSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

test('60%側では単一のお題を生成する', () => {
  const result = generateOdai(source, [], randomSequence([0.1, 0, 0]));
  assert.deepEqual(result, { topic: 'ピース', displayText: '今週のお題：ピース' });
});

test('40%側では異なる許可カテゴリを結合する', () => {
  const result = generateOdai(source, [], randomSequence([0.9, 0, 0.3, 0, 0]));
  assert.equal(result.topic, 'ピース×パーカー');
});

test('禁止カテゴリの組み合わせを再抽選する', () => {
  const result = generateOdai(
    source,
    [],
    randomSequence([0.9, 0, 0.6, 0, 0.3, 0, 0]),
  );
  assert.equal(result.topic, 'ピース×パーカー');
});

test('履歴と一致したお題を再抽選する', () => {
  const result = generateOdai(
    source,
    ['今週のお題：ピース'],
    randomSequence([0.1, 0, 0, 0.1, 0, 0.75]),
  );
  assert.equal(result.topic, 'ダブルピース');
});

test('SNS用ハッシュタグでは括弧を除去し、組み合わせ記号をxへ変換する', () => {
  assert.equal(
    buildOdaiHashtags('グッドサイン（親指立て）×魔女'),
    '#グッドサイン親指立てx魔女 #お題メーカー',
  );
});

test('週次X投稿へツールのURLを付ける', () => {
  assert.equal(
    buildWeeklyOdaiXPost('角×手紙', 'https://yukimiworks.com/'),
    '今週のお題\n#角x手紙 #お題メーカー\nhttps://yukimiworks.com/works/odai-maker',
  );
});

test('月曜日08:00 JSTで週を切り替える', () => {
  assert.equal(getOdaiWeekWindow(new Date('2026-10-04T22:59:59.000Z')).weekId, '2026-09-28');
  assert.equal(getOdaiWeekWindow(new Date('2026-10-04T23:00:00.000Z')).weekId, '2026-10-05');
});

test('週次X投稿はVercel本番かつ専用フラグ有効時だけ有効にする', () => {
  assert.equal(getWeeklyOdaiXPostingMode({ VERCEL_ENV: 'preview', X_WEEKLY_ODAI_ENABLED: 'true' }), 'disabled');
  assert.equal(getWeeklyOdaiXPostingMode({ VERCEL_ENV: 'production', X_WEEKLY_ODAI_ENABLED: 'false' }), 'disabled');
  assert.equal(
    getWeeklyOdaiXPostingMode({ VERCEL_ENV: 'production', X_WEEKLY_ODAI_ENABLED: 'true', X_POST_DRY_RUN: 'true' }),
    'dry-run',
  );
  assert.equal(getWeeklyOdaiXPostingMode({ VERCEL_ENV: 'production', X_WEEKLY_ODAI_ENABLED: 'true' }), 'enabled');
});
