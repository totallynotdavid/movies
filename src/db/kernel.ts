import { db } from "void/db";
import type { BatchItem } from "drizzle-orm/batch";
import { chunk } from "../../shared/chunk";

// D1 caps bound parameters at 100 per statement. We size every bulk write off
// the actual bound-column count of a row and keep headroom under that hard cap,
// so adding a column can never silently breach it.
const PARAM_CAP = 90;

export type Statement = BatchItem<"sqlite">;

// Splits rows into statements that each stay under the bound-parameter cap. The
// conflict clause lives in `build` (the caller owns upsert semantics); the
// kernel owns only the chunk math. Returns statements, it does not execute.
export function insertChunks<Row>(rows: Row[], build: (part: Row[]) => Statement): Statement[] {
  if (rows.length === 0) return [];
  const boundColumns = Object.keys(rows[0] as Record<string, unknown>).length;
  const size = Math.max(1, Math.floor(PARAM_CAP / boundColumns));
  return chunk(rows, size).map(build);
}

// Equality-IN lookups bind one parameter per id, so a large id list overflows a
// single statement. Chunk the ids and concatenate the runs.
export async function selectByIds<Id extends string | number, R>(
  ids: readonly Id[],
  run: (batch: Id[]) => Promise<R[]>,
): Promise<R[]> {
  const out: R[] = [];
  for (const part of chunk([...ids], PARAM_CAP)) out.push(...(await run(part)));
  return out;
}

// Runs statements as ONE atomic D1 batch (single transaction, single round
// trip). Empty is a no-op. This atomicity is what makes a half-written entity
// graph, fresh marker without its data, unrepresentable.
export async function runBatch(statements: Statement[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as [Statement, ...Statement[]]);
}
