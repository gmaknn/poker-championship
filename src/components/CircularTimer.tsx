'use client';

import { useEffect, useState } from 'react';

interface CircularTimerProps {
  timeRemaining: number | null;
  totalDuration: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularTimer({
  timeRemaining,
  totalDuration,
  size = 300,
  strokeWidth = 12
}: CircularTimerProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (timeRemaining !== null && totalDuration > 0) {
      const newProgress = (timeRemaining / totalDuration) * 100;
      setProgress(Math.max(0, Math.min(100, newProgress)));
    }
  }, [timeRemaining, totalDuration]);

  // Calculate circle parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Determine color based on remaining time
  const getColor = () => {
    if (timeRemaining === null) return '#6b7280'; // gray
    if (timeRemaining < 60) return '#ef4444'; // red
    if (timeRemaining < 120) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  // Determine glow intensity for pulse effect
  const getPulseIntensity = () => {
    if (timeRemaining === null) return 0;
    if (timeRemaining < 30) return 20;
    if (timeRemaining < 60) return 10;
    return 0;
  };

  const color = getColor();
  const pulseIntensity = getPulseIntensity();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
            filter: pulseIntensity > 0
              ? `drop-shadow(0 0 ${pulseIntensity}px ${color})`
              : 'none',
          }}
          className={timeRemaining !== null && timeRemaining < 60 ? 'animate-pulse' : ''}
        />

        {/* Glow effect for urgency */}
        {pulseIntensity > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth + 4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            opacity="0.3"
            style={{
              filter: `blur(8px)`,
            }}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Center dot indicator */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
