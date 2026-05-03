"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { IconAlertCircle, IconCircleCheck, IconX } from "@tabler/icons-react";

type ToastVariant = "success" | "error";

type ToastInput = {
  title?: string;
  description: string;
  duration?: number;
};

type Toast = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  success: (
    description: string,
    options?: Omit<ToastInput, "description">,
  ) => void;
  error: (
    description: string,
    options?: Omit<ToastInput, "description">,
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, input: ToastInput) => {
      const id = crypto.randomUUID();
      const toast = { id, variant, ...input };

      setToasts((current) => [...current.slice(-3), toast]);
      window.setTimeout(() => removeToast(id), input.duration ?? 4500);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (description, options) =>
        pushToast("success", { description, ...options }),
      error: (description, options) =>
        pushToast("error", { description, ...options }),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const isSuccess = toast.variant === "success";
  const Icon = isSuccess ? IconCircleCheck : IconAlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg shadow-slate-900/10 backdrop-blur ${
        isSuccess ? "border-emerald-100" : "border-red-100"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isSuccess
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        <Icon size={19} stroke={2.2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {toast.title ?? (isSuccess ? "Success" : "Error")}
        </p>
        <p className="mt-0.5 text-sm leading-5 text-slate-600">
          {toast.description}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss notification"
      >
        <IconX size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
