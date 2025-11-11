// components/tryout/Timer.tsx

import { useEffect, useRef, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TimerProps {
  initialTime: number; // seconds
  onTimeUp: () => void;
  isPaused?: boolean;
}

export function Timer({ initialTime, onTimeUp, isPaused = false }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const warningShownRef = useRef(false);
  const criticalShownRef = useRef(false);
  const hasTimeUpBeenCalledRef = useRef(false);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (isPaused) return;

    // Time up handler
    if (timeLeft <= 0 && !hasTimeUpBeenCalledRef.current) {
      hasTimeUpBeenCalledRef.current = true;
      onTimeUp();
      return;
    }

    // Warning at 10 minutes (600 seconds)
    if (timeLeft === 600 && !warningShownRef.current) {
      toast.warning('⚠️ Perhatian! Waktu tersisa 10 menit!', {
        duration: 5000,
      });
      warningShownRef.current = true;
    }

    // Critical warning at 5 minutes (300 seconds)
    if (timeLeft === 300 && !criticalShownRef.current) {
      toast.error('🚨 Peringatan! Waktu tersisa 5 menit!', {
        duration: 5000,
      });
      criticalShownRef.current = true;
    }

    // Countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, isPaused]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 300) return 'text-red-600 bg-red-50 border-red-200'; // Critical (5 min)
    if (timeLeft <= 600) return 'text-orange-600 bg-orange-50 border-orange-200'; // Warning (10 min)
    return 'text-blue-600 bg-blue-50 border-blue-200'; // Normal
  };

  const getTimerIcon = () => {
    if (timeLeft <= 300) return <AlertCircle className="w-5 h-5 animate-pulse" />;
    return <Clock className="w-5 h-5" />;
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-mono font-bold transition-all ${getTimerColor()}`}>
      {getTimerIcon()}
      <span className="text-lg">
        {formatTime(timeLeft)}
      </span>
      {timeLeft <= 60 && (
        <span className="text-xs font-normal animate-pulse">
          (detik terakhir!)
        </span>
      )}
    </div>
  );
}
