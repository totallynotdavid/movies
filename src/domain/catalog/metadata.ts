import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "void/db";
import { companies, genres, mediaCompanies, mediaGenres, mediaTitles } from "@schema";
import { insertChunks, selectByIds, type Statement } from "@/db/kernel";
import type { AltTitleInput, CompanyInput, GenreInput } from "@/shared/types/metadata";

export type GenreView = { name: string };
export type CompanyView = { kind: "company" | "network"; name: string };
export type AltTitleView = { languageCode: string; title: string };

export function listMediaGenres(mediaId: string): Promise<GenreView[]> {
  return db
    .select({ name: genres.name })
    .from(mediaGenres)
    .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
    .where(eq(mediaGenres.mediaId, mediaId));
}

// Bulk genre names grouped per title, for aggregation across a set of media
// (wrapped recap, mirror). Single source for the mediaGenres⋈genres join.
export async function genresByMedia(mediaIds: readonly string[]): Promise<Map<string, string[]>> {
  const rows = await selectByIds(mediaIds, (batch) =>
    db
      .select({ mediaId: mediaGenres.mediaId, genreName: genres.name })
      .from(mediaGenres)
      .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
      .where(inArray(mediaGenres.mediaId, batch)),
  );

  const byMedia = new Map<string, string[]>();
  for (const row of rows) {
    const list = byMedia.get(row.mediaId) ?? [];
    list.push(row.genreName);
    byMedia.set(row.mediaId, list);
  }
  return byMedia;
}

export function listMediaCompanies(mediaId: string): Promise<CompanyView[]> {
  return db
    .select({ kind: companies.kind, name: companies.name })
    .from(mediaCompanies)
    .innerJoin(companies, eq(mediaCompanies.companyId, companies.id))
    .where(eq(mediaCompanies.mediaId, mediaId));
}

export function listMediaTitles(mediaId: string): Promise<AltTitleView[]> {
  return db
    .select({ languageCode: mediaTitles.languageCode, title: mediaTitles.title })
    .from(mediaTitles)
    .where(eq(mediaTitles.mediaId, mediaId))
    .orderBy(asc(mediaTitles.languageCode));
}

function genreId(tmdbId: number) {
  return `tmdb:genre:${tmdbId}`;
}

function companyId(kind: string, tmdbId: number) {
  return `tmdb:${kind}:${tmdbId}`;
}

export function mediaGenresWrite(mediaId: string, items: GenreInput[]): Statement[] {
  const statements: Statement[] = [];
  if (items.length > 0) {
    const dict = items.map((g) => ({ id: genreId(g.tmdbId), tmdbId: g.tmdbId, name: g.name }));
    statements.push(
      ...insertChunks(dict, (part) =>
        db
          .insert(genres)
          .values(part)
          .onConflictDoUpdate({ target: genres.tmdbId, set: { name: sql`excluded.name` } }),
      ),
    );
  }

  statements.push(db.delete(mediaGenres).where(eq(mediaGenres.mediaId, mediaId)));

  if (items.length > 0) {
    const links = items.map((g) => ({
      id: `${mediaId}:g:${g.tmdbId}`,
      mediaId,
      genreId: genreId(g.tmdbId),
    }));
    statements.push(
      ...insertChunks(links, (part) => db.insert(mediaGenres).values(part).onConflictDoNothing()),
    );
  }

  return statements;
}

export function mediaCompaniesWrite(mediaId: string, items: CompanyInput[]): Statement[] {
  const statements: Statement[] = [];
  if (items.length > 0) {
    const dict = items.map((c) => ({
      id: companyId(c.kind, c.tmdbId),
      tmdbId: c.tmdbId,
      kind: c.kind,
      name: c.name,
      logoPath: c.logoPath,
      originCountry: c.originCountry,
    }));
    statements.push(
      ...insertChunks(dict, (part) =>
        db
          .insert(companies)
          .values(part)
          .onConflictDoUpdate({
            target: [companies.kind, companies.tmdbId],
            set: {
              name: sql`excluded.name`,
              logoPath: sql`excluded.logo_path`,
              originCountry: sql`excluded.origin_country`,
            },
          }),
      ),
    );
  }

  statements.push(db.delete(mediaCompanies).where(eq(mediaCompanies.mediaId, mediaId)));

  if (items.length > 0) {
    const links = items.map((c) => ({
      id: `${mediaId}:c:${companyId(c.kind, c.tmdbId)}`,
      mediaId,
      companyId: companyId(c.kind, c.tmdbId),
    }));
    statements.push(
      ...insertChunks(links, (part) =>
        db.insert(mediaCompanies).values(part).onConflictDoNothing(),
      ),
    );
  }

  return statements;
}

export function mediaTitlesWrite(mediaId: string, items: AltTitleInput[]): Statement[] {
  const statements: Statement[] = [db.delete(mediaTitles).where(eq(mediaTitles.mediaId, mediaId))];
  if (items.length > 0) {
    const rows = items.map((t) => ({
      id: `${mediaId}:t:${t.languageCode}`,
      mediaId,
      languageCode: t.languageCode,
      title: t.title,
    }));
    statements.push(
      ...insertChunks(rows, (part) => db.insert(mediaTitles).values(part).onConflictDoNothing()),
    );
  }
  return statements;
}
