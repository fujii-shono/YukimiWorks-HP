import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextNumericUrlId } from '../../lib/content/urlId';

test('使用中IDがない場合は1を返す', () => {
  assert.equal(getNextNumericUrlId([]), '1');
});

test('使用中の数値IDを避けて最小の欠番を返す', () => {
  assert.equal(getNextNumericUrlId(['1', '2', '4']), '3');
});

test('非数値IDと先頭ゼロ付きIDは採番を妨げない', () => {
  assert.equal(getNextNumericUrlId(['my-work', '01', '2']), '1');
});

test('編集中のレコード自身を使用中IDから除外して再利用できる', () => {
  const usedIds = new Set(['1', '2']);
  usedIds.delete('1');
  assert.equal(getNextNumericUrlId(usedIds), '1');
});
