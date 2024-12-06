import React, { createContext, useContext, useState } from "react";

interface ToastState {
  isVisible: boolean;
  message: string;
  type: "info" | "success" | "error";
}

interface ToastContextType {
  showToast: (message: string, type: ToastState["type"]) => void;
  hideToast: () => void;
  toast: ToastState;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: "",
    type: "info",
  });

  const showToast = (message: string, type: ToastState["type"]) => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
      <div
        className={`toast toast-top toast-center transition-opacity duration-300 ${
          toast.isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`alert ${
            toast.type === "success"
              ? "alert-success"
              : toast.type === "error"
              ? "alert-error"
              : "alert-info"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
} 