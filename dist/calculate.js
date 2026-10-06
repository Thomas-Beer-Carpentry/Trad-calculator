// Decimal inputs become exact fractions. No rounded value feeds another calculation.
const gcd = (a, b) => b ? gcd(b, a % b) : (a < 0n ? -a : a);
const fraction = (num, den = 1n) => { const d = gcd(num, den); return { num: num / d, den: den / d }; };
const add = (a, b) => fraction(a.num * b.den + b.num * a.den, a.den * b.den);
const sub = (a, b) => fraction(a.num * b.den - b.num * a.den, a.den * b.den);
const mul = (a, n) => fraction(a.num * n, a.den);
const div = (a, n) => fraction(a.num, a.den * n);
const ceil = (a, b) => { const num = a.num * b.den, den = a.den * b.num; return num <= 0n ? 0n : (num + den - 1n) / den; };

function decimal(value, label) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) throw new Error(`Enter ${label.toLowerCase()}.`);
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || text.length > 64) throw new Error(`${label} must be a positive number.`);
  const [whole, part = ''] = text.split('.');
  const result = fraction(BigInt((whole || '0') + part), 10n ** BigInt(part.length));
  if (result.num <= 0n) throw new Error(`${label} must be greater than zero.`);
  return result;
}

export function calculate(input) {
  if (!['count', 'maximum'].includes(input.method)) throw new Error('Choose how to lay out the marks.');
  if (!['more', 'same'].includes(input.ending)) throw new Error('Choose an ending.');
  if (!['away', 'before'].includes(input.cross)) throw new Error('Choose which side of the mark the board goes on.');
  const length = decimal(input.length, 'Overall length');
  const width = input.material ? decimal(input.width, 'Board width') : fraction(0n);
  if (sub(length, width).num < 0n) throw new Error('The board width is greater than the overall length.');
  const extra = input.ending === 'more' ? 1n : 0n;
  let count;
  if (input.method === 'count') {
    const raw = String(input.count ?? '').trim();
    if (!raw) throw new Error(`Enter how many ${input.material ? 'boards' : 'marks'} you need.`);
    if (!/^\d+$/.test(raw) || raw.length > 16 || BigInt(raw) < 1n) throw new Error(`Enter a whole number of ${input.material ? 'boards' : 'marks'}, at least 1.`);
    count = BigInt(raw);
  } else {
    const maximum = decimal(input.maximum, 'Maximum spacing');
    count = ceil(sub(length, mul(maximum, extra)), add(width, maximum));
    if (input.material && count === 0n) count = 1n;
  }
  if (count > 9007199254740990n) throw new Error('Too many marks. Use a larger spacing or a smaller number.');
  const available = sub(length, mul(width, count));
  if (available.num < 0n) throw new Error(input.method === 'maximum' ? 'The boards cannot fit with this maximum spacing. Try a narrower board or a larger spacing.' : 'The material cannot fit within the overall length. Use fewer or narrower boards.');
  const spaces = count + extra;
  const gap = spaces ? div(available, spaces) : length;
  const step = spaces ? div(add(length, mul(width, extra)), spaces) : length;
  return { length, width, gap, count: Number(count), spaces: Number(spaces), material: Boolean(input.material), ending: input.ending, cross: input.cross,
    mark(index) {
      if (!Number.isSafeInteger(index) || index < 1 || index > Number(count)) throw new Error('That mark is outside the layout.');
      const far = mul(step, BigInt(index));
      return input.material && input.cross === 'away' ? sub(far, width) : far;
    }
  };
}

export function format(value) {
  let d = value.den, twos = 0, fives = 0;
  while (d % 2n === 0n) { twos++; d /= 2n; }
  while (d % 5n === 0n) { fives++; d /= 5n; }
  const exactPlaces = Math.max(twos, fives);
  let places = d === 1n ? Math.min(exactPlaces, 18) : 3;
  // Preserve small measurements instead of displaying a positive value as zero.
  if (value.num > 0n && value.num < value.den) {
    let scaled = value.num;
    let leading = 0;
    while (scaled < value.den && leading < 64) { scaled *= 10n; leading++; }
    places = Math.max(places, leading + 2);
  }
  const scale = 10n ** BigInt(places);
  const scaled = value.num * scale;
  const rounded = (scaled * 2n + value.den) / (value.den * 2n);
  const raw = rounded.toString().padStart(places + 1, '0');
  const number = places ? `${raw.slice(0, -places)}.${raw.slice(-places)}`.replace(/\.?0+$/, '') : raw;
  return { text: number, approximate: scaled % value.den !== 0n };
}
