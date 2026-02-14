import { useState, useEffect, useRef } from 'react';

interface UseCountdownTimerReturn {
    timeRemaining: number; // in seconds
    formattedTime: string; // MM:SS format
    isRunning: boolean;
    isExpired: boolean;
    start: () => void;
    pause: () => void;
    reset: () => void;
}

export function useCountdownTimer(durationInMinutes: number): UseCountdownTimerReturn {
    const [timeRemaining, setTimeRemaining] = useState(durationInMinutes * 60);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRunning, timeRemaining]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const start = () => setIsRunning(true);
    const pause = () => setIsRunning(false);
    const reset = () => {
        setIsRunning(false);
        setTimeRemaining(durationInMinutes * 60);
    };

    return {
        timeRemaining,
        formattedTime: formatTime(timeRemaining),
        isRunning,
        isExpired: timeRemaining === 0,
        start,
        pause,
        reset,
    };
}
