import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { toolCallContext, type ToolCallContext } from './tool-call-context.js';

/**
 * Environment variable that turns on the debug log. Set it to a file path and the
 * server appends one JSON object per line there. Unset, nothing is written.
 *
 * The server's stderr is only visible while a host keeps it, and most hosts do not.
 * This file outlives the process, so a failed call can be read after the fact.
 */
export const MCP_LOG_FILE_ENV = 'TRANSCEND_MCP_LOG_FILE';

/** Characters of the correlation id shown to people as the call reference */
const CALL_REF_LENGTH = 8;

/** Directories already created, so `mkdir` runs once per path */
const preparedDirectories = new Set<string>();

/** Whether the write failure warning was already printed */
let warnedAboutWriteFailure = false;

/**
 * Path of the debug log file, or `undefined` when logging is off.
 *
 * @returns Absolute or relative path from {@link MCP_LOG_FILE_ENV}
 */
export function getMcpLogFile(): string | undefined {
  const path = process.env[MCP_LOG_FILE_ENV]?.trim();
  return path || undefined;
}

/**
 * Whether the debug log is on.
 *
 * @returns `true` when {@link MCP_LOG_FILE_ENV} names a file
 */
export function isMcpDebugLogEnabled(): boolean {
  return getMcpLogFile() !== undefined;
}

/**
 * Short reference that ties a form, a log line, and a request together.
 *
 * @param context - Call context, defaults to the current tool call
 * @returns First 8 characters of the correlation id, or `undefined` outside a call
 */
export function getCallRef(
  context: ToolCallContext | undefined = toolCallContext.getStore(),
): string | undefined {
  return context?.correlationId.slice(0, CALL_REF_LENGTH);
}

function appendLine(file: string, record: Record<string, unknown>): void {
  try {
    if (!preparedDirectories.has(file)) {
      mkdirSync(dirname(file), { recursive: true });
      preparedDirectories.add(file);
    }
    appendFileSync(file, `${JSON.stringify(record)}\n`);
  } catch (error) {
    // Logging must never fail a tool call. Say so once, so a bad path is not silent.
    if (!warnedAboutWriteFailure) {
      warnedAboutWriteFailure = true;
      process.stderr.write(
        `[mcp-debug-log] Cannot write to ${file}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
}

/**
 * Appends one event to the debug log. Does nothing when logging is off.
 *
 * Never pass tool argument values, tokens, or other secrets in `data`. Names and
 * counts are fine.
 *
 * @param event - Dotted event name, for example `confirmation.form.sent`
 * @param data - Extra fields for this event
 * @param context - Call context, defaults to the current tool call
 */
export function logMcpDebugEvent(
  event: string,
  data?: Record<string, unknown>,
  context: ToolCallContext | undefined = toolCallContext.getStore(),
): void {
  const file = getMcpLogFile();
  if (!file) return;
  appendLine(file, {
    ts: new Date().toISOString(),
    pid: process.pid,
    event,
    ref: getCallRef(context),
    tool: context?.toolName,
    requestId: context?.requestId,
    ...(data && { data }),
  });
}

/**
 * Reduces a tool result to fields that are safe to log: whether it succeeded and
 * its error code. The payload and error text can hold customer data, so they stay out.
 *
 * @param result - Value a tool handler returned
 * @returns Loggable fields
 */
export function describeToolResult(result: unknown): Record<string, unknown> {
  if (result === null || typeof result !== 'object') return {};
  const { success, code } = result as { success?: unknown; code?: unknown };
  return {
    ...(typeof success === 'boolean' && { success }),
    ...(typeof code === 'string' && { code }),
  };
}

/**
 * Copies a line from the server logger into the debug log.
 *
 * @param level - Logger level
 * @param message - Logger message
 * @param data - Logger payload; errors are reduced to name and message
 */
export function mirrorLogToDebugFile(level: string, message: string, data?: unknown): void {
  if (!isMcpDebugLogEnabled()) return;
  logMcpDebugEvent('log', {
    level,
    message,
    ...(data !== undefined && {
      detail: data instanceof Error ? { name: data.name, message: data.message } : data,
    }),
  });
}
