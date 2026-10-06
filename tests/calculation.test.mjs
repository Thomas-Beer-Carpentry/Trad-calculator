import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, format } from '../dist/calculate.js';
const base = { length: '2000', method: 'count', count: '3', material: true, width: '50', ending: 'more', cross: 'away' };
const marks = result => Array.from({ length: result.count }, (_, i) => format(result.mark(i + 1)).text);
test('required Cross Away and Cross Before examples', () => {
  const away = calculate(base);
  assert.equal(format(away.gap).text, '462.5');
  assert.deepEqual(marks(away), ['462.5', '975', '1487.5']);
  assert.deepEqual(marks(calculate({ ...base, cross: 'before' })), ['512.5', '1025', '1537.5']);
});
test('same number ends at the board edge, and at the final mark without material', () => {
  assert.equal(format(calculate({ ...base, ending: 'same' }).mark(3)).text, '1950');
  assert.equal(format(calculate({ ...base, ending: 'same', cross: 'before' }).mark(3)).text, '2000');
  assert.equal(format(calculate({ ...base, ending: 'same', material: false }).mark(3)).text, '2000');
});
test('maximum spacing selects the minimum fitting number and redistributes all gaps', () => {
  const more = calculate({ ...base, method: 'maximum', maximum: '450' });
  assert.equal(more.count, 4);
  assert.equal(format(more.gap).text, '360');
  assert.deepEqual(marks(more), ['360', '770', '1180', '1590']);
  const same = calculate({ ...base, method: 'maximum', maximum: '450', ending: 'same' });
  assert.equal(same.count, 4);
  assert.equal(format(same.gap).text, '450');
  assert.equal(calculate({ ...base, method: 'maximum', maximum: '450', material: false }).count, 4);
});
test('small exact decimals stay exact and cumulative measurements do not drift', () => {
  const small = calculate({ ...base, length: '0.8', width: '0.05' });
  assert.equal(format(small.gap).text, '0.1625');
  assert.deepEqual(marks(small), ['0.1625', '0.375', '0.5875']);
  const many = calculate({ ...base, count: '1000000', material: false, ending: 'same' });
  assert.equal(format(many.mark(1000000)).text, '2000');
  assert.equal(format(many.mark(1)).text, '0.002');
  assert.equal(format(calculate({ ...base, material: false, ending: 'same' }).gap).approximate, true);
});
test('fit boundaries, blank/zero/nonfinite input and impossible maximum layouts', () => {
  assert.throws(() => calculate({ ...base, length: '500', width: '200' }), /cannot fit/);
  assert.throws(() => calculate({ ...base, length: '500', width: '200.2' }), /cannot fit/);
  assert.throws(() => calculate({ ...base, length: '1', count: '1', width: '1.1' }), /greater than/);
  assert.throws(() => calculate({ ...base, length: '500', width: '200', method: 'maximum', maximum: '10' }), /cannot fit/);
  assert.throws(() => calculate({ ...base, width: '2001' }), /greater than/);
  for (const length of ['', '0', '-1', 'Infinity', 'NaN']) assert.throws(() => calculate({ ...base, length }));
  for (const count of ['', '0', '-1', '2.5']) assert.throws(() => calculate({ ...base, count }));
  assert.throws(() => calculate({ ...base, method: 'maximum', maximum: '0' }));
  assert.equal(format(calculate({ ...base, length: '150' }).gap).text, '0');
  const empty = calculate({ ...base, length: '400', method: 'maximum', maximum: '450', material: false });
  assert.equal(empty.count, 0);
  assert.equal(format(empty.gap).text, '400');
  const decimalEmpty = calculate({ ...base, length: '1.5', method: 'maximum', maximum: '2', material: false });
  assert.equal(decimalEmpty.count, 0);
  assert.equal(format(decimalEmpty.gap).text, '1.5');
});
