
import React, { createContext, useCallback, useContext, useState } from 'react';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastItem {
  id: number;
  message: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
          >
            <span className="text-sm font-medium text-gray-800">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

export default ToastProvider;
export { useToast, ToastProvider };
