/**
 * A tiny analytics logger. Nothing is sent anywhere yet: in development events are printed to the
 * console. To connect a real service later, call setAnalyticsSink once at startup, e.g.
 *   setAnalyticsSink((name, props) => posthog.capture(name, props));
 */
type Props = Record<string, string | number | boolean | null | undefined>;
type Sink = (name: string, props: Props) => void;

let sink: Sink | null = null;

export function setAnalyticsSink(next: Sink | null) {
  sink = next;
}

export function track(name: string, props: Props = {}) {
  try {
    if (sink) sink(name, props);
    else if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[analytics] ${name}`, props);
  } catch {
    // Analytics must never break the app.
  }
}
