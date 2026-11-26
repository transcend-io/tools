/** One parsed line of the debug log written by `logMcpDebugEvent` */
interface DebugLogRecord {
  ts: string;
  event: string;
  ref?: string;
  tool?: string;
  requestId?: string | number;
  data?: Record<string, unknown>;
}

/** Options for {@link formatMcpTimeline} */
export interface FormatMcpTimelineOptions {
  /** Print every event for this call reference instead of one line per call */
  ref?: string;
}

function parseRecords(jsonl: string): DebugLogRecord[] {
  const records: DebugLogRecord[] = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as DebugLogRecord;
      if (typeof parsed.ts === 'string' && typeof parsed.event === 'string') records.push(parsed);
    } catch (error) {
      // A line cut short by a killed process is expected at the end of a log
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  return records;
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function offset(record: DebugLogRecord, start: number): string {
  return `+${seconds(Date.parse(record.ts) - start)}`;
}

function summarizeCall(ref: string, events: DebugLogRecord[]): string {
  const first = events[0]!;
  const start = Date.parse(first.ts);
  const find = (event: string): DebugLogRecord | undefined =>
    events.find((record) => record.event === event);

  const received = find('call.received');
  const parts: string[] = [];

  const describeEnd = find('confirmation.describe.end');
  if (describeEnd) {
    parts.push(
      `describe ${seconds(Number(describeEnd.data?.elapsedMs ?? 0))} ${String(describeEnd.data?.outcome ?? '?')}`,
    );
  }

  const formSent = find('confirmation.form.sent');
  if (formSent) {
    const answered = find('confirmation.form.answered');
    const failed = find('confirmation.form.error');
    const abandoned = find('confirmation.form.abandoned');
    let formState = 'no answer seen';
    if (answered) {
      formState = `answered ${offset(answered, start)} (${String(answered.data?.action ?? '?')})`;
    } else if (abandoned) {
      formState = `abandoned ${offset(abandoned, start)} (host cancelled or timed out)`;
    } else if (failed) {
      formState = `failed ${offset(failed, start)} (${String(failed.data?.error ?? '?')})`;
    }
    parts.push(`form sent ${offset(formSent, start)}, ${formState}`);
  }

  const handlerEnd = find('handler.end') ?? find('handler.error');
  if (handlerEnd) {
    const ok = handlerEnd.event === 'handler.end';
    parts.push(
      `handler ${seconds(Number(handlerEnd.data?.elapsedMs ?? 0))} ${ok ? 'ok' : 'error'}`,
    );
  }

  const progressSent = events.filter((record) => record.event === 'progress.sent').length;
  const hasToken = received?.data?.hasProgressToken === true;
  parts.push(`progress token ${hasToken ? 'yes' : 'no'}, ${progressSent} sent`);

  const end = find('call.end');
  const aborted = find('call.aborted');
  let outcome = 'no end logged (still running, or the server stopped)';
  if (aborted) {
    outcome = `ABORTED by host at ${seconds(Number(aborted.data?.elapsedMs ?? 0))}`;
    if (end) outcome += `, handler finished later at ${offset(end, start)}`;
  } else if (end) {
    outcome = `${String(end.data?.outcome ?? 'ended')} in ${seconds(Number(end.data?.elapsedMs ?? 0))}`;
  }

  const clock = first.ts.slice(11, 19);
  return `${ref} ${first.tool ?? '?'} ${clock}Z | ${parts.join(' | ')} | ${outcome}`;
}

function listEvents(events: DebugLogRecord[]): string {
  const start = Date.parse(events[0]!.ts);
  return events
    .map((record) => {
      const detail = record.data ? ` ${JSON.stringify(record.data)}` : '';
      return `${offset(record, start).padStart(8)}  ${record.event}${detail}`;
    })
    .join('\n');
}

/**
 * Turns a debug log (JSON lines from `logMcpDebugEvent`) into a short report.
 *
 * By default prints one line per tool call: describe, form, answer, handler, and how
 * the call ended. Pass `ref` to print every event of one call.
 *
 * @param jsonl - Contents of the log file
 * @param options - Output options
 * @returns Report text
 */
export function formatMcpTimeline(jsonl: string, options: FormatMcpTimelineOptions = {}): string {
  const byRef = new Map<string, DebugLogRecord[]>();
  for (const record of parseRecords(jsonl)) {
    if (!record.ref) continue;
    const events = byRef.get(record.ref) ?? [];
    events.push(record);
    byRef.set(record.ref, events);
  }

  if (options.ref) {
    const events = byRef.get(options.ref);
    return events ? listEvents(events) : `No events found for ref ${options.ref}.`;
  }

  if (byRef.size === 0) return 'No tool calls found in the log.';
  return [...byRef.entries()].map(([ref, events]) => summarizeCall(ref, events)).join('\n');
}
