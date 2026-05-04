import type { Generated } from 'kysely'

export interface DatabaseSchema {
  users: {
    id: string
    email: string
    username: string
    password_hash: string
    score_system: string
    is_admin: number
    is_excluded_from_aggregation: number
    created_at: string
    updated_at: string
  }
  user_sessions: {
    id: string
    user_id: string
    token_hash: string
    csrf_token_hash: string
    expires_at: string
    created_at: string
  }
  request_sessions: {
    id: string
    user_id: string | null
    session_id: string | null
    ip_hash: string | null
    user_agent: string | null
    created_at: string
  }
  auth_throttle_counters: {
    key: string
    attempts: number
    locked_until: string | null
    updated_at: string
  }
  entities: {
    id: string
    type: 'movie' | 'show'
    slug: string
    title: string
    original_title: string | null
    overview: string | null
    poster_path: string | null
    backdrop_path: string | null
    tmdb_id: number
    release_date: string | null
    first_air_date: string | null
    vote_average: number | null
    vote_count: number | null
    popularity: number | null
    fetched_at: string
    created_at: string
    updated_at: string
  }
  entity_genres: {
    entity_id: string
    genre_id: number
    genre_name: string
  }
  library_entries: {
    id: string
    user_id: string
    entity_id: string
    status: string
    score100: number | null
    progress_current: number
    progress_total: number | null
    started_on: string | null
    finished_on: string | null
    rewatch_count: number
    notes: string | null
    updated_at: string
  }
  watch_events: {
    id: string
    user_id: string
    entity_id: string
    episode_id: string | null
    event_type: string
    watched_on: string
    created_at: string
  }
  external_fetch_cache: {
    key: string
    url: string
    body: string
    fetched_at: string
    stale_at: string
  }
  auth_events: {
    id: string
    user_id: string | null
    event_type: string
    ip_hash: string | null
    created_at: string
  }
  movies: {
    entity_id: string
    runtime_minutes: number | null
  }
  shows: {
    entity_id: string
    episode_count: number | null
    season_count: number | null
  }
  seasons: {
    id: string
    show_id: string
    season_number: number
    name: string | null
    tmdb_id: number | null
  }
  episodes: {
    id: string
    season_id: string
    episode_number: number
    title: string
    tmdb_id: number | null
    air_date: string | null
  }
  lists: {
    id: string
    user_id: string
    title: string
    created_at: string
  }
  list_items: {
    list_id: string
    entity_id: string
    position: number
  }
  favorites: {
    user_id: string
    entity_id: string
    created_at: string
  }
  recommendations: {
    id: string
    user_id: string
    entity_id: string
    body: string | null
    created_at: string
  }
  recommendation_votes: {
    recommendation_id: string
    user_id: string
    value: number
    created_at: string
  }
  aggregate_snapshots: {
    id: string
    entity_id: string
    average_score100: number | null
    tracked_count: number
    created_at: string
  }
}

export type Id = Generated<string>
