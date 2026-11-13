/**
 * The Cook Mode timer on the Lock Screen and in the Dynamic Island (iOS Live Activity).
 *
 * This function is marked with the 'widget' directive: at build time it's turned into a string
 * and runs inside the widget extension, not in the app. So it must be self-contained: it can't
 * use variables from outside, and colors come in through props (from src/theme liveActivity).
 *
 * The countdown and the progress bar are SwiftUI timer views (`timerInterval`): iOS animates them
 * itself, the app doesn't send an update every second. The cat turns worried in the last
 * 10 seconds through the activity's stale date (`isStale`), which iOS also flips on its own.
 * The alarm face needs the app (it's shown when the app sees the timer end).
 */
import { Button, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, clipShape, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, LiveActivityLayout } from 'expo-widgets';
import type { LiveActivityPalette } from '../theme';

export type CookTimerActivityProps = {
  timerId: string;
  recipeTitle: string;
  /** "Step 2 · Boil the pasta" */
  stepLine: string;
  /** "10 min timer" */
  label: string;
  state: 'running' | 'paused' | 'ringing';
  /** The whole timer's window (ms). Running: start..end move with pauses. */
  startMs: number;
  endMs: number;
  /** Shown when paused: "4:05". */
  pausedText: string;
  /** 0..1, used when paused or ringing (no live timer then). */
  progress: number;
  /** Local file URIs of the buddy's face in three moods (copied to the shared widgets folder). Empty if unavailable. */
  faces: { calm: string; worried: string; alarm: string };
  buddyName: string;
  palette: LiveActivityPalette;
};

export function CookTimerActivity(props: CookTimerActivityProps, env: LiveActivityEnvironment): LiveActivityLayout {
  'widget';
  const p = props;
  const dark = env.colorScheme === 'dark';
  const c = dark ? p.palette.dark : p.palette.light;
  const island = p.palette.island;
  const ringing = p.state === 'ringing';
  const paused = p.state === 'paused';
  // iOS marks the activity stale at (end - 10 s) on its own: the cat starts to worry.
  const mood = ringing ? 'alarm' : !paused && env.isStale ? 'worried' : 'calm';
  const face = p.faces[mood] || p.faces.calm;
  const window = { lower: new Date(p.startMs), upper: new Date(p.endMs) };
  const rounded = (size: number, weight: 'semibold' | 'bold' | 'heavy' = 'semibold') => font({ size, weight, design: 'rounded' });

  // The time: a native countdown while running, fixed text otherwise.
  const time = (size: number, color: string) =>
    ringing ? (
      <Text modifiers={[rounded(size, 'heavy'), foregroundStyle(color)]}>Time’s up!</Text>
    ) : paused ? (
      <Text modifiers={[rounded(size, 'heavy'), monospacedDigit(), foregroundStyle(color)]}>{p.pausedText}</Text>
    ) : (
      <Text timerInterval={window} countsDown modifiers={[rounded(size, 'heavy'), monospacedDigit(), foregroundStyle(color)]} />
    );

  // The bar fills as time passes, natively; static when paused or ringing.
  const bar = (color: string, track: string) =>
    paused || ringing ? (
      <ProgressView value={ringing ? 1 : p.progress} modifiers={[progressViewStyle('linear'), tint(color), foregroundStyle(track)]} />
    ) : (
      <ProgressView timerInterval={window} countsDown={false} modifiers={[progressViewStyle('linear'), tint(color), foregroundStyle(track)]} />
    );

  // A small ring for the compact Dynamic Island.
  const ring = (color: string) =>
    paused || ringing ? (
      <ProgressView value={ringing ? 1 : p.progress} modifiers={[progressViewStyle('circular'), tint(color), frame({ width: 22, height: 22 })]} />
    ) : (
      <ProgressView timerInterval={window} countsDown={false} modifiers={[progressViewStyle('circular'), tint(color), frame({ width: 22, height: 22 })]} />
    );

  const cat = (size: number) =>
    face ? (
      <Image uiImage={face} modifiers={[frame({ width: size, height: size }), clipShape('circle')]} />
    ) : (
      <Image systemName={ringing ? 'alarm.fill' : 'timer'} size={size * 0.6} color={ringing ? c.alarm : c.accent} />
    );

  // Pause/Resume and Stop. Buttons in Live Activities need iOS 17; on 16 the system hides them.
  const controls = (color: string, label: string) => (
    <HStack spacing={8}>
      {ringing ? null : paused ? (
        <Button label="Resume" systemImage="play.fill" target={`resume:${p.timerId}`} modifiers={[tint(color), rounded(14, 'bold')]} />
      ) : (
        <Button label="Pause" systemImage="pause.fill" target={`pause:${p.timerId}`} modifiers={[tint(color), rounded(14, 'bold')]} />
      )}
      <Button label={ringing ? 'Stop' : 'Cancel'} systemImage={ringing ? 'stop.fill' : 'xmark'} target={`stop:${p.timerId}`} modifiers={[tint(ringing ? c.alarm : label), rounded(14, 'bold')]} />
    </HStack>
  );

  const accent = ringing ? c.alarm : c.accent;

  return {
    // Lock Screen and Notification Center: warm cream card (cocoa in dark mode).
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(c.background)]}>
        <HStack spacing={12}>
          {cat(56)}
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[rounded(15, 'bold'), foregroundStyle(c.label), lineLimit(1)]}>{p.recipeTitle}</Text>
            <Text modifiers={[rounded(13), foregroundStyle(c.secondaryLabel), lineLimit(1)]}>{p.stepLine}</Text>
          </VStack>
          <Spacer />
          {time(30, accent)}
        </HStack>
        {bar(accent, c.track)}
        <HStack>
          <Text modifiers={[rounded(12), foregroundStyle(c.secondaryLabel)]}>{paused ? `${p.label} · paused` : ringing ? `${p.buddyName} says: check it now!` : p.label}</Text>
          <Spacer />
          {controls(c.accent, c.secondaryLabel)}
        </HStack>
      </VStack>
    ),
    // Dynamic Island, expanded (long-press): the island is always black.
    expandedLeading: cat(44),
    expandedTrailing: time(26, ringing ? island.alarm : island.accent),
    expandedCenter: (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[rounded(14, 'bold'), foregroundStyle(island.label), lineLimit(1)]}>{p.recipeTitle}</Text>
        <Text modifiers={[rounded(12), foregroundStyle(island.secondaryLabel), lineLimit(1)]}>{p.stepLine}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={8}>
        {bar(ringing ? island.alarm : island.accent, '#3A2C22')}
        {controls(island.accent, island.secondaryLabel)}
      </VStack>
    ),
    // Dynamic Island, compact: cat on the left, time on the right.
    compactLeading: cat(24),
    compactTrailing: ringing ? (
      <Image systemName="alarm.fill" color={island.alarm} size={16} />
    ) : paused ? (
      <Text modifiers={[rounded(14, 'bold'), monospacedDigit(), foregroundStyle(island.secondaryLabel)]}>{p.pausedText}</Text>
    ) : (
      <Text timerInterval={window} countsDown modifiers={[rounded(14, 'bold'), monospacedDigit(), foregroundStyle(island.accent), frame({ maxWidth: 52 })]} />
    ),
    // Dynamic Island, minimal (when two activities share it): a progress ring.
    minimal: ring(ringing ? island.alarm : island.accent),
  };
}
