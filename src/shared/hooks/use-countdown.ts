'use client';
import { useEffect, useState } from 'react';

export function secondsRemaining(endAt: number | null, at = Date.now()) {
  return endAt === null ? 0 : Math.max(0, Math.ceil((endAt - at) / 1000));
}
export function useCountdown(endAt: number | null) {
  const [left, setLeft] = useState(() => secondsRemaining(endAt));
  useEffect(() => {
    const update = () => setLeft(secondsRemaining(endAt));
    update();
    if (endAt === null) return;
    const timer = window.setInterval(update, 250);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); window.removeEventListener('pageshow', update); };
  }, [endAt]);
  return left;
}
