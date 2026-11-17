
'use client';

import { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
    id: number;
    type: NotificationType;
    message: string;
    duration: number;
}

interface NotificationToastProps {
    notification: NotificationItem;
    onClose: (id: number) => void;
}

const icons: Record<NotificationType, string> = {
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'i',
};

const titles: Record<NotificationType, string> = {
    success: 'Operación exitosa',
    error: 'Ha ocurrido un error',
    warning: 'Atención',
    info: 'Información',
};

export default function NotificationToast({
    notification,
    onClose,
}: NotificationToastProps) {
    const { id, type, message, duration } = notification;

    useEffect(() => {
        const timer = window.setTimeout(() => onClose(id), duration);
        return () => window.clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div className={`ansec-toast ansec-toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
            <div className="ansec-toast-icon">{icons[type]}</div>

            <div className="ansec-toast-content">
                <strong>{titles[type]}</strong>
                <p>{message}</p>
            </div>

            <button
                type="button"
                className="ansec-toast-close"
                onClick={() => onClose(id)}
                aria-label="Cerrar notificación"
            >
                ×
            </button>

            <div
                className="ansec-toast-progress"
                style={{ animationDuration: `${duration}ms` }}
            />
        </div>
    );
}
