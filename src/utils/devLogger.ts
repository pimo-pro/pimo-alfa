const canLog = import.meta.env.DEV;

/** Em DEV: `info` para resumos de performance; `error` para falhas. Resto em silêncio. */
export const devLogger = {
  debug: (..._args: unknown[]) => {},
  info: (...args: unknown[]) => {
    if (!canLog) return;
    console.info(...args);
  },
  warn: (..._args: unknown[]) => {},
  error: (...args: unknown[]) => {
    if (!canLog) return;
    console.error(...args);
  },
};
