import { useToast } from "../context/ToastContext";

export function useAdminFeedback() {
  const { showToast } = useToast();

  return {
    success: (message: string) => showToast(message, "info"),
    warning: (message: string) => showToast(message, "warning"),
    error: (message: string) => showToast(message, "error"),
  };
}
