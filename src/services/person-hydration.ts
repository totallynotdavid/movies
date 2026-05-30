import { logger } from "void/log";
import { fetchPersonDetail, tmdbToken } from "../integrations/tmdb";
import {
  findPersonBySlug,
  markPersonDetailsFailedWrite,
  personScalarsWrite,
  type PersonRecord,
} from "../domain/people";
import { runBatch } from "../db/kernel";
import { summarizeCause } from "../domain/hydration";
import { attempt } from "../result";
import type { FilmographyEntry, PersonCrewEntry } from "../../shared/types/metadata";

export type PersonView = {
  person: PersonRecord;
  acting: FilmographyEntry[];
  crew: PersonCrewEntry[];
};

// Person pages always call TMDB on view: the filmography (acting/crew) is not
// persisted, so it must be fetched to render. We persist only the scalar bio
// fields. A failure is recorded durably and degrades to the existing record
// with an empty filmography rather than breaking the page.
export async function ensurePersonDetails(person: PersonRecord): Promise<PersonView> {
  if (!tmdbToken()) return { person, acting: [], crew: [] };

  const fetched = await attempt(fetchPersonDetail(person.tmdbId), (cause) => cause);
  if (!fetched.ok) {
    logger.warn("person details hydration failed", { personId: person.id, cause: fetched.error });
    // Best-effort: recording the failure must not throw into the loader.
    const marked = await attempt(
      runBatch(markPersonDetailsFailedWrite(person.id, summarizeCause(fetched.error))),
      (cause) => cause,
    );
    if (!marked.ok) {
      logger.warn("failed to record person hydration error", {
        personId: person.id,
        cause: marked.error,
      });
    }
    return { person, acting: [], crew: [] };
  }

  const detail = fetched.value;
  const written = await attempt(
    runBatch(personScalarsWrite(person.id, detail.scalars)),
    (cause) => cause,
  );
  if (!written.ok) {
    logger.warn("person scalars persist failed", { personId: person.id, cause: written.error });
  }
  const refreshed = (await findPersonBySlug(person.slug)) ?? person;
  return { person: refreshed, acting: detail.acting, crew: detail.crew };
}
