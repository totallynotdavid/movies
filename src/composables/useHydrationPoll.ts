import { onUnmounted, ref } from "vue";

type PollOptions<T> = {
  // One fetch of the current state. Rejections are treated as transient.
  fetch: () => Promise<T>;
  // Stop polling once the watched state has settled (hydrated or failed).
  isDone: (value: T) => boolean;
  // Apply a fetched value to the view.
  onData: (value: T) => void;
  baseMs?: number;
  maxMs?: number;
  maxAttempts?: number;
};

// Background poll for an off-request hydration to land. Exponential backoff and
// a hard attempt cap keep a never-completing hydration from polling forever, and
// transient fetch failures count toward the cap rather than being swallowed
// silently into an infinite retry.
export function useHydrationPoll<T>(options: PollOptions<T>) {
  const baseMs = options.baseMs ?? 2_000;
  const maxMs = options.maxMs ?? 30_000;
  const maxAttempts = options.maxAttempts ?? 12;

  const polling = ref(false);
  let timer: number | null = null;
  let attempt = 0;

  function clearTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    clearTimer();
    polling.value = false;
    attempt = 0;
  }

  function schedule() {
    clearTimer();
    attempt += 1;
    if (attempt > maxAttempts) {
      stop();
      return;
    }
    const delay = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
    timer = window.setTimeout(run, delay);
  }

  async function run() {
    timer = null;
    let value: T;
    try {
      value = await options.fetch();
    } catch {
      schedule();
      return;
    }
    options.onData(value);
    if (options.isDone(value)) {
      stop();
      return;
    }
    schedule();
  }

  function start() {
    if (polling.value) return;
    polling.value = true;
    attempt = 0;
    schedule();
  }

  onUnmounted(stop);

  return { start, stop, polling };
}
