import { useEffect, useState } from 'react';

type Phase = 'idle' | 'running' | 'done';

/* Long enough for the finishing fill and fade in App.css (0.45s) to play out
   before the bar resets. */
const FINISH_MS = 500;

/* The line above the composer, filling while a query runs. The backend answers
   in one response, so the fill is paced by time, not measured: it trickles
   toward 90% and only reaches the end when the answer arrives. */
export function QueryProgress({ loading }: { loading: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle');

  /* Start on send; on answer, finish only a bar that was actually running. */
  useEffect(() => {
    if (loading) {
      setPhase('running');
      return;
    }
    setPhase(prev => {
      if (prev === 'running') return 'done';
      return prev;
    });
  }, [loading]);

  /* Hold the full bar long enough to be seen, then reset. */
  useEffect(() => {
    if (phase !== 'done') return;
    const id = setTimeout(() => setPhase('idle'), FINISH_MS);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <div
      role="progressbar"
      aria-label="Generating answer"
      aria-hidden={phase === 'idle'}
      className={`query-progress query-progress--${phase}`}
    >
      <div className="query-progress-bar" />
    </div>
  );
}
