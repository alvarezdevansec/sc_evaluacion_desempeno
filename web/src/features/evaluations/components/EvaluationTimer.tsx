
'use client';

import './EvaluationTimer.css';

interface EvaluationTimerProps {
    remainingSeconds: number;
    isExpired: boolean;
}

export default function EvaluationTimer({
    remainingSeconds,
    isExpired,
}: EvaluationTimerProps) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const totalSeconds = 20 * 60;
    const progress = Math.max(
        0,
        Math.min(100, (remainingSeconds / totalSeconds) * 100),
    );

    const isCritical = remainingSeconds <= 60;
    const isWarning = remainingSeconds <= 300 && !isCritical;

    const statusClass = isExpired
        ? 'evaluation-timer--expired'
        : isCritical
            ? 'evaluation-timer--critical'
            : isWarning
                ? 'evaluation-timer--warning'
                : '';

    return (
        <div className={`evaluation-timer ${statusClass}`}>
            <div className="evaluation-timer__content">
                <div className="evaluation-timer__label">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>

                    <span>
                        {isExpired
                            ? 'Evaluación finalizada'
                            : 'Tiempo restante de evaluación'}
                    </span>
                </div>

                <div className="evaluation-timer__progress">
                    <div
                        className="evaluation-timer__progress-value"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <strong className="evaluation-timer__time">
                    {isExpired ? '00:00' : formattedTime}
                </strong>
            </div>
        </div>
    );
}
