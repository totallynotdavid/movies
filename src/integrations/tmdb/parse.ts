import * as v from "valibot";

// Validation building blocks for the TMDB boundary. The integration is an
// anti-corruption layer: it maps-or-rejects so invalid rows never reach the
// domain, and the projection schemas catch upstream shape drift at the fields
// we actually consume. Schemas use `v.object` (extra TMDB keys are ignored).

// Optional object entries: a missing key defaults to null; a present value is
// coerced, non-empty string / finite number kept, anything else becomes null. The
// outer v.optional is what makes the key optional on the parent object.
export const NullStr = v.optional(
  v.pipe(
    v.unknown(),
    v.transform((x) => (typeof x === "string" && x.trim() !== "" ? x : null)),
  ),
  null,
);

export const NullNum = v.optional(
  v.pipe(
    v.unknown(),
    v.transform((x) => (typeof x === "number" && Number.isFinite(x) ? x : null)),
  ),
  null,
);

// Required fields: a row missing these is invalid and gets dropped by looseArray.
export const Id = v.number();
export const NonEmptyStr = v.pipe(v.string(), v.trim(), v.minLength(1));

// An array that keeps the rows passing `row` and drops the ones that don't,
// instead of rejecting the whole array on one bad element. Missing becomes []. Each
// element falls back to null on failure (via nullable so the fallback type is
// legal), then the nulls are filtered out.
export function looseArray<S extends v.GenericSchema>(row: S) {
  const element = v.fallback(v.nullable(row), null);
  return v.pipe(
    v.fallback(v.array(element), []),
    v.transform((rows) => rows.filter((r): r is v.InferOutput<S> => r !== null)),
  );
}

export function parse<S extends v.GenericSchema>(schema: S, data: unknown): v.InferOutput<S> {
  return v.parse(schema, data);
}
