import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
    timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience helpers
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error',   dur || 4500);
  toast.info    = (msg, dur) => toast(msg, 'info',    dur);
  toast.warn    = (msg, dur) => toast(msg, 'warn',    dur);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error:   <XCircle      className="w-4 h-4 text-red-400 shrink-0" />,
    info:    <Info         className="w-4 h-4 text-purple-400 shrink-0" />,
    warn:    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  };

  const bars = {
    success: 'bg-emerald-500',
    error:   'bg-red-500',
    info:    'bg-purple-500',
    warn:    'bg-amber-500',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
              bg-[#18181f] border border-white/10 rounded-2xl shadow-2xl shadow-black/60
              px-4 py-3 transition-all duration-300 relative overflow-hidden
              ${t.leaving ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
          >
            {/* Accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${bars[t.type]}`} />

            {/* Icon */}
            <span className="mt-0.5">{icons[t.type]}</span>

            {/* Message */}
            <p className="flex-1 text-xs text-white font-outfit leading-relaxed">{t.message}</p>

            {/* Close */}
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 hover:text-white transition shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
