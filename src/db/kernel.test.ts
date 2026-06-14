import { describe, expect, it } from "vitest";
import { insertChunks, selectByIds } from "./kernel";

// The kernel exists to keep every bulk write under D1's 100-bound-parameter cap
// without per-call-site magic constants. These tests lock the chunk math: the
// thing that regresses *silently* when a column is added to a write path.

describe("insertChunks", () => {
  it("splits rows so no chunk can exceed the 90-param cap", () => {
    // 10 bound columns per row means 9 rows per statement under the 90-param cap.
    const rows = Array.from({ length: 200 }, (_, i) => ({
      a: i,
      b: i,
      c: i,
      d: i,
      e: i,
      f: i,
      g: i,
      h: i,
      j: i,
      k: i,
    }));

    const parts: (typeof rows)[] = [];
    const statements = insertChunks(rows, (part) => {
      parts.push(part);
      return part as never; // build's return is opaque to the kernel
    });

    expect(statements).toHaveLength(parts.length);
    expect(parts).toHaveLength(Math.ceil(200 / 9));
    const columns = 10;
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(9);
      expect(part.length * columns).toBeLessThanOrEqual(90);
    }
    // Every row lands exactly once, in order.
    expect(parts.flat()).toEqual(rows);
  });

  it("shrinks the chunk as the bound-column count grows", () => {
    // Wider rows reduce the allowed rows per statement.
    const wide = (i: number) =>
      Object.fromEntries(Array.from({ length: 30 }, (_, c) => [`col${c}`, i]));
    const rows = Array.from({ length: 10 }, (_, i) => wide(i));

    const parts: (typeof rows)[] = [];
    insertChunks(rows, (part) => {
      parts.push(part);
      return part as never;
    });

    for (const part of parts) expect(part.length).toBeLessThanOrEqual(3);
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
