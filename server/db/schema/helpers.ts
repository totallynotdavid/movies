import type { SqlDatabase } from "../client.ts";

export interface IndexSpec {
  name: string;
  table: string;
  columns: string[];
}

export async function createIndexes(db: SqlDatabase, specs: IndexSpec[]): Promise<void> {
  for (const spec of specs) {
    let builder = db.schema.createIndex(spec.name).ifNotExists().on(spec.table);
    builder =
      spec.columns.length === 1 ? builder.column(spec.columns[0]) : builder.columns(spec.columns);
    await builder.execute();
  }
}
