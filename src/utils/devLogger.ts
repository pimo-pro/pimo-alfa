type LogMethod = "debug" | "info" | "warn" | "error";

const canLog = import.meta.env.DEV;

function write(method: LogMethod, ...args: unknown[]): void {
  if (!canLog) return;
  console[method](...args);
}

export const devLogger = {
  debug: (...args: unknown[]) => write("debug", ...args),
  info: (...args: unknown[]) => write("info", ...args),
  warn: (...args: unknown[]) => write("warn", ...args),
  error: (...args: unknown[]) => write("error", ...args),
};
