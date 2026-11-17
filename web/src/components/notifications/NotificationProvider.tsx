
'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import NotificationToast, {
    type NotificationItem,
    type NotificationType,
} from './NotificationToast';

import ConfirmModal, {
    type ConfirmOptions,
} from './ConfirmModal';

import './notifications.css';

interface NotificationContextValue {
    notify: {
        success: (message: string, duration?: number) => void;
        error: (message: string, duration?: number) => void;
        warning: (message: string, duration?: number) => void;
        info: (message: string, duration?: number) => void;
    };
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

    const nextId = useRef(0);
    const confirmResolver = useRef<((value: boolean) => void) | null>(null);

    const removeNotification = useCallback((id: number) => {
        setNotifications((current) => current.filter((item) => item.id !== id));
    }, []);

    const addNotification = useCallback((
        type: NotificationType,
        message: string,
        duration = 4000,
    ) => {
        const id = ++nextId.current;

        setNotifications((current) => [
            ...current.slice(-3),
            { id, type, message, duration },
        ]);
    }, []);

    const notify = useMemo(() => ({
        success: (message: string, duration?: number) =>
            addNotification('success', message, duration),
        error: (message: string, duration?: number) =>
            addNotification('error', message, duration),
        warning: (message: string, duration?: number) =>
            addNotification('warning', message, duration),
        info: (message: string, duration?: number) =>
            addNotification('info', message, duration),
    }), [addNotification]);

    const confirm = useCallback((options: ConfirmOptions) => {
        // Evita dejar una confirmación anterior pendiente.
        confirmResolver.current?.(false);

        setConfirmOptions(options);

        return new Promise<boolean>((resolve) => {
            confirmResolver.current = resolve;
        });
    }, []);

    const finishConfirm = useCallback((result: boolean) => {
        confirmResolver.current?.(result);
        confirmResolver.current = null;
        setConfirmOptions(null);
    }, []);

    useEffect(() => {
        if (!confirmOptions) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') finishConfirm(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmOptions, finishConfirm]);

    const contextValue = useMemo(
        () => ({ notify, confirm }),
        [notify, confirm],
    );

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}

            <div className="ansec-toast-container">
                {notifications.map((notification) => (
                    <NotificationToast
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            <ConfirmModal
                options={confirmOptions}
                onConfirm={() => finishConfirm(true)}
                onCancel={() => finishConfirm(false)}
            />
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            'useNotifications debe utilizarse dentro de NotificationProvider.',
        );
    }

    return context;
}
