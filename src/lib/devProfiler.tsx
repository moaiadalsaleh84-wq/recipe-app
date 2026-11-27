/**
 * Dev-only render timing: with EXPO_PUBLIC_PROFILE=1, each wrapped screen logs how long React spent
 * rendering it on every commit ("[profile] Home mount 42.1"). Off (and zero cost) otherwise.
 */
import { Profiler, type ComponentType, type ProfilerOnRenderCallback } from 'react';

const ON = process.env.EXPO_PUBLIC_PROFILE === '1';

const log: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  console.log(`[profile] ${id} ${phase} ${actualDuration.toFixed(1)}`);
};

export function withProfiler<P extends object>(id: string, Screen: ComponentType<P>): ComponentType<P> {
  if (!ON) return Screen;
  function Profiled(props: P) {
    return (
      <Profiler id={id} onRender={log}>
        <Screen {...props} />
      </Profiler>
    );
  }
  return Profiled;
}
