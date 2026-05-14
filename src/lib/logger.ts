export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

type LogPayload = {
  level: LogLevel;
  timestamp: string;
  scope: string;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string } | unknown;
};

function serializeError(err: unknown): LogPayload["error"] {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return err;
}

function emit(
  level: LogLevel,
  scope: string,
  message: string,
  context?: LogContext,
  err?: unknown,
): void {
  const payload: LogPayload = {
    level,
    timestamp: new Date().toISOString(),
    scope,
    message,
  };
  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }
  if (err !== undefined) {
    payload.error = serializeError(err);
  }
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logError(
  scope: string,
  message: string,
  err?: unknown,
  context?: LogContext,
): void {
  emit("error", scope, message, context, err);
}

export function logWarn(
  scope: string,
  message: string,
  context?: LogContext,
): void {
  emit("warn", scope, message, context);
}

export function logInfo(
  scope: string,
  message: string,
  context?: LogContext,
): void {
  emit("info", scope, message, context);
}
