export interface WorkerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  debug(message: string): void;
}

export function createLogger(scope: string): WorkerLogger {
  const write = (level: string, message: string) => {
    const line = `${new Date().toISOString()} ${level.padEnd(5)} [${scope}] ${message}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
  };
  return {
    info: (message) => write('INFO', message),
    warn: (message) => write('WARN', message),
    error: (message, error) =>
      write('ERROR', error instanceof Error ? `${message}: ${error.stack ?? error.message}` : message),
    debug: (message) => {
      if (process.env.LOG_LEVEL === 'debug') write('DEBUG', message);
    },
  };
}
