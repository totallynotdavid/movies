import { describe, expect, it } from "vite-plus/test";
import { insertChunks, selectByIds } from "./kernel";

// Bulk writes must stay under D1's 100-bound-parameter cap. A column added to a
// write path shrinks the chunk silently, so these lock the chunk math.

describe("insertChunks", () => {
  it.each([
    { columns: 10, rowCount: 200, maxRows: 9 },
    { columns: 30, rowCount: 10, maxRows: 3 },
  ])("keeps $columns-column rows under the 90-param cap", ({ columns, rowCount, maxRows }) => {
    const rows = Array.from({ length: rowCount }, (_, i) =>
      Object.fromEntries(Array.from({ length: columns }, (_, c) => [`col${c}`, i])),
    );

    const parts: (typeof rows)[] = [];
    const statements = insertChunks(rows, (part) => {
      parts.push(part);
      return part as never; // build's return is opaque to the kernel
    });

    expect(statements).toHaveLength(parts.length);
    expect(parts).toHaveLength(Math.ceil(rowCount / maxRows));
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(maxRows);
    expect(parts.flat()).toEqual(rows);
  });

  it("returns no statements for an empty payload", () => {
    let called = false;
    const statements = insertChunks([], () => {
      called = true;
      return null as never;
    });
    expect(statements).toEqual([]);
    expect(called).toBe(false);
  });
});

describe("selectByIds", () => {
  it("chunks the id list under the cap and concatenates runs in order", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => i);

    const batches: number[][] = [];
    const result = await selectByIds(ids, async (batch) => {
      batches.push(batch);
      return batch.map((id) => ({ id }));
    });

    expect(batches).toHaveLength(Math.ceil(250 / 90));
    for (const batch of batches) expect(batch.length).toBeLessThanOrEqual(90);
    expect(result.map((r) => r.id)).toEqual(ids);
  });

  it("never calls run for an empty id list", async () => {
    let called = false;
    const result = await selectByIds([], async () => {
      called = true;
      return [];
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });
});
