/** Minimum time the loading spinner stays up, in ms. Cached crawls resolve in
 *  ~50ms, which would flash the spinner too fast to read; this guarantees the
 *  loading module is actually perceptible on every fetch. Genuinely slow loads
 *  are unaffected (the pad is zero once real work exceeds this). */
export const MIN_SPINNER_MS = 650

/** Resolves no sooner than `ms` after `start`, so the spinner has a floor. */
export function afterMinDuration(start: number, ms = MIN_SPINNER_MS): Promise<void> {
  const remaining = Math.max(0, ms - (Date.now() - start))
  return new Promise((resolve) => setTimeout(resolve, remaining))
}
