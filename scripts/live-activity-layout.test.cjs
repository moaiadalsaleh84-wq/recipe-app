/**
 * Tests the Live Activity layout the way the widget extension runs it.
 *
 * At build time, babel-preset-expo turns the 'widget' function into a source string; the
 * extension later evaluates that string with @expo/ui components as globals. Here we do the same
 * with stand-in components, so we can check every state without an iPhone: what SwiftUI draws
 * from the result can only be checked on a device.
 *
 * Run: node --test scripts/live-activity-layout.test.cjs
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const babel = require(require.resolve('@babel/core', { paths: [require.resolve('expo/package.json')] }));

const file = path.join(__dirname, '../src/widgets/CookTimerActivity.tsx');
const out = babel.transformFileSync(file, {
  babelrc: false,
  configFile: false,
  presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] })],
  caller: { name: 'metro', platform: 'ios', isDev: false, bundler: 'metro' },
  filename: file,
}).code;

// The widget plugin replaced the function with a template literal holding its source.
const match = out.match(/CookTimerActivity\s*=\s*(`[\s\S]*?`);/);
const source = match ? eval(match[1]) : null;

// Stand-in runtime: components and modifiers just record what they were given.
const el = (type) => (props) => ({ type, props });
const runtime = {
  _jsx: (type, props) => (typeof type === 'function' ? type(props) : { type, props }),
  _jsxs: (type, props) => (typeof type === 'function' ? type(props) : { type, props }),
  jsx: (type, props) => ({ type, props }),
  _Fragment: 'Fragment',
  Button: el('Button'), HStack: el('HStack'), Image: el('Image'), ProgressView: el('ProgressView'), Spacer: el('Spacer'), Text: el('Text'), VStack: el('VStack'),
};
for (const m of ['activityBackgroundTint', 'clipShape', 'font', 'foregroundStyle', 'frame', 'lineLimit', 'monospacedDigit', 'padding', 'progressViewStyle', 'tint']) {
  runtime[m] = (...args) => ({ modifier: m, args });
}
const layout = source ? new Function(...Object.keys(runtime), `return (${source});`)(...Object.values(runtime)) : null;

const palette = {
  light: { background: '#FFF6E9', card: '#FFFDF8', label: '#4A2E1F', secondaryLabel: '#8A6A57', accent: '#C25A30', track: '#F1DFC8', alarm: '#D9423A', border: '#E7CFB3' },
  dark: { background: '#1E1611', card: '#2A2019', label: '#FFF1E0', secondaryLabel: '#D9BFA6', accent: '#F0905F', track: '#3A2C22', alarm: '#FF5A4F', border: '#4A372A' },
  island: { accent: '#F0905F', label: '#FFF1E0', secondaryLabel: '#D9BFA6', alarm: '#FF5A4F' },
  worriedSeconds: 10,
};
const base = {
  timerId: 't1', recipeTitle: 'Butter Chicken', stepLine: 'Step 3 · Simmer the sauce', label: '18 minutes timer', state: 'running',
  startMs: 1_800_000_000_000, endMs: 1_800_001_080_000, pausedText: '7:30', progress: 0.58,
  faces: { calm: 'file:///g/calm.png', worried: 'file:///g/worried.png', alarm: 'file:///g/alarm.png' }, buddyName: 'Tank', palette,
};

/** All nodes in a tree, flattened. */
function all(node, acc = []) {
  if (Array.isArray(node)) node.forEach((n) => all(n, acc));
  else if (node && typeof node === 'object') {
    if (node.type) acc.push(node);
    for (const v of Object.values(node.props ?? {})) all(v, acc);
    if (!node.type) for (const v of Object.values(node)) all(v, acc);
  }
  return acc;
}
const find = (tree, type, pred = () => true) => all(tree).filter((n) => n.type === type && pred(n.props));
const mods = (n) => (n.props.modifiers ?? []).map((m) => m.modifier);
const texts = (tree) => all(tree).filter((n) => n.type === 'Text').map((n) => [].concat(n.props.children ?? []).join(''));

test('the build turns the layout into a self-contained string', () => {
  assert.ok(source, 'widget plugin output not found');
  assert.ok(!/require\(|_interopRequire|import /.test(source), 'layout must not depend on modules');
  assert.equal(typeof layout, 'function');
});

test('running: native countdown and progress bar from the timer window, calm cat, all Dynamic Island regions', () => {
  const l = layout(base, { colorScheme: 'light', isStale: false });
  for (const k of ['banner', 'compactLeading', 'compactTrailing', 'minimal', 'expandedLeading', 'expandedTrailing', 'expandedCenter', 'expandedBottom']) assert.ok(l[k], `missing ${k}`);
  const countdown = find(l.banner, 'Text', (p) => p.timerInterval);
  assert.equal(countdown.length, 1);
  assert.equal(countdown[0].props.timerInterval.upper.getTime(), base.endMs);
  assert.equal(countdown[0].props.countsDown, true);
  const bar = find(l.banner, 'ProgressView', (p) => p.timerInterval);
  assert.equal(bar.length, 1);
  assert.equal(bar[0].props.countsDown, false, 'bar fills as time passes');
  assert.equal(find(l.banner, 'Image')[0].props.uiImage, base.faces.calm);
  assert.ok(find(l.compactTrailing, 'Text', (p) => p.timerInterval).length || l.compactTrailing.props?.timerInterval);
  assert.ok(find(l.minimal, 'ProgressView').length || l.minimal.type === 'ProgressView');
  // SF Pro Rounded everywhere.
  const fonts = all(l.banner).flatMap((n) => (n.props.modifiers ?? []).filter((m) => m.modifier === 'font'));
  assert.ok(fonts.length > 0 && fonts.every((f) => f.args[0].design === 'rounded'));
  // Pause and Cancel, aimed at this timer.
  assert.deepEqual(find(l.banner, 'Button').map((b) => b.props.target).sort(), ['pause:t1', 'stop:t1']);
});

test('last 10 seconds: iOS marks it stale and the cat looks worried', () => {
  const l = layout(base, { colorScheme: 'light', isStale: true });
  assert.equal(find(l.banner, 'Image')[0].props.uiImage, base.faces.worried);
  assert.equal(l.compactLeading.props.uiImage, base.faces.worried);
});

test('paused: fixed time, static bar, Resume button', () => {
  const l = layout({ ...base, state: 'paused' }, { colorScheme: 'light', isStale: true });
  assert.equal(find(l.banner, 'Text', (p) => p.timerInterval).length, 0, 'no live countdown while paused');
  assert.ok(texts(l.banner).includes('7:30'));
  assert.equal(find(l.banner, 'ProgressView')[0].props.value, 0.58);
  assert.equal(find(l.banner, 'Image')[0].props.uiImage, base.faces.calm, 'a paused timer is not a worry');
  assert.ok(find(l.banner, 'Button').some((b) => b.props.target === 'resume:t1'));
});

test('ringing: alarm face, "Time’s up!", Stop only', () => {
  const l = layout({ ...base, state: 'ringing' }, { colorScheme: 'light', isStale: true });
  assert.equal(find(l.banner, 'Image')[0].props.uiImage, base.faces.alarm);
  assert.ok(texts(l.banner).includes('Time’s up!'));
  assert.deepEqual(find(l.banner, 'Button').map((b) => b.props.target), ['stop:t1']);
});

test('dark mode uses the dark palette; the Dynamic Island always uses the island colors', () => {
  const lightTint = layout(base, { colorScheme: 'light' }).banner.props.modifiers.find((m) => m.modifier === 'activityBackgroundTint');
  const darkTint = layout(base, { colorScheme: 'dark' }).banner.props.modifiers.find((m) => m.modifier === 'activityBackgroundTint');
  assert.equal(lightTint.args[0], '#FFF6E9');
  assert.equal(darkTint.args[0], '#1E1611');
  const island = layout(base, { colorScheme: 'light' }).expandedTrailing;
  assert.ok(JSON.stringify(island).includes('#F0905F'));
});

test('without face images it falls back to a symbol instead of an empty space', () => {
  const l = layout({ ...base, faces: { calm: '', worried: '', alarm: '' } }, { colorScheme: 'light' });
  const img = find(l.banner, 'Image')[0];
  assert.equal(img.props.uiImage, undefined);
  assert.equal(img.props.systemName, 'timer');
});
