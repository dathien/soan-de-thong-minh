import React, { useEffect, useRef, useState } from 'react';
import { MotionLevel } from '../types';

interface AnimatedCounterProps {
  value: number;
  motionLevel?: MotionLevel;
  durationMs?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  motionLevel = 'gentle',
  durationMs = 750,
}) => {
  const [display, setDisplay] = useState<number>(value === 0 ? 0 : value);
  const animatedOnceRef = useRef(false);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (value === 0 || motionLevel === 'off' || prefersReduced) {
      setDisplay(value);
      prevValueRef.current = value;
      return;
    }

    // Only animate count-up cleanly on initial mount with data or value change from 0
    if (animatedOnceRef.current && prevValueRef.current === value) {
      return;
    }

    animatedOnceRef.current = true;
    const startVal = prevValueRef.current === value ? 0 : prevValueRef.current;
    prevValueRef.current = value;

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (value - startVal) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [value, motionLevel, durationMs]);

  return <span className="tabular-nums">{display}</span>;
};
