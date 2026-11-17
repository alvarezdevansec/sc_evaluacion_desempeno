
'use client';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ConfirmModalProps {
    options: ConfirmOptions | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    options,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!options) return null;

    return (
        <div
            className="ansec-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <section
                className="ansec-confirm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ansec-confirm-title"
            >
                <div className={`ansec-modal-icon ${options.danger ? 'danger' : ''}`}>
                    {options.danger ? '!' : '?'}
                </div>

                <h2 id="ansec-confirm-title">{options.title}</h2>
                <p>{options.message}</p>

                <div className="ansec-modal-actions">
                    <button
                        type="button"
                        className="ansec-modal-cancel"
                        onClick={onCancel}
                    >
                        {options.cancelText ?? 'Cancelar'}
                    </button>

                    <button
                        type="button"
                        className={`ansec-modal-confirm ${options.danger ? 'danger' : ''}`}
                        onClick={onConfirm}
                    >
                        {options.confirmText ?? 'Confirmar'}
                    </button>
                </div>
            </section>
        </div>
    );
}
