import { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'confirm';
  confirmLabel?: string;
  confirmColor?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmOptions {
  confirmLabel?: string;
  confirmColor?: string;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  confirm: (msg: string, opts?: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  confirm: () => Promise.resolve(false),
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type: 'success' }]);
    setTimeout(() => remove(id), 3000);
  }, [remove]);

  const error = useCallback((message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type: 'error' }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const confirm = useCallback((message: string, opts?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = ++toastId;
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type: 'confirm',
          confirmLabel: opts?.confirmLabel,
          confirmColor: opts?.confirmColor,
          onConfirm: () => { remove(id); resolve(true); },
          onCancel: () => { remove(id); resolve(false); },
        },
      ]);
    });
  }, [remove]);

  return (
    <ToastContext.Provider value={{ success, error, confirm }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 lg:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-[100] flex flex-col gap-2 sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl shadow-2xl px-4 py-3 text-sm font-medium backdrop-blur-sm animate-[slideUp_0.2s_ease-out] ${
              t.type === 'success'
                ? 'bg-green-600/90 text-white dark:bg-green-500/90'
                : t.type === 'error'
                ? 'bg-red-600/90 text-white dark:bg-red-500/90'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t.type === 'confirm' ? (
              <div>
                <p className="mb-3">{t.message}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={t.onCancel}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={t.onConfirm}
                    className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors min-h-[40px] ${
                      t.confirmColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {t.confirmLabel || 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span>{t.message}</span>
                <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
