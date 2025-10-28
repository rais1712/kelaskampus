import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface TimerProps {
  timeLeft: number;
  onTick: () => void;
  onTimeUp: () => void;
}

export function Timer({ timeLeft, onTick, onTimeUp }: TimerProps) {
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    if (timeLeft === 600 && !warningShownRef.current) {
      toast.warning('Perhatian! Waktu tersisa 10 menit!');
      warningShownRef.current = true;
    }

    const timer = setInterval(() => {
      onTick();
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTick, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 600;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[#364153] font-medium text-lg">Waktu Tersisa:</span>
      <span 
        className={`font-mono text-lg ${isWarning ? 'text-red-600 font-bold' : 'text-[#364153]'}`}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
