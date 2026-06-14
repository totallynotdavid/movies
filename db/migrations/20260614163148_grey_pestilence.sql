CREATE TABLE `cast_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`person_id` text NOT NULL,
	`character` text,
	`billing_order` integer,
	`episode_count` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cast_media` ON `cast_credits` (`media_id`);--> statement-breakpoint
CREATE INDEX `idx_cast_person` ON `cast_credits` (`person_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`logo_path` text,
	`origin_country` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_company_kind_tmdb` ON `companies` (`kind`,`tmdb_id`);--> statement-breakpoint
CREATE TABLE `crew_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`person_id` text NOT NULL,
	`department` text NOT NULL,
	`job` text NOT NULL,
	`episode_count` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_crew_media` ON `crew_credits` (`media_id`);--> statement-breakpoint
CREATE INDEX `idx_crew_person` ON `crew_credits` (`person_id`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`name` text,
	`runtime` integer,
	`air_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_episode_media_season_number` ON `episodes` (`media_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE INDEX `idx_episode_media` ON `episodes` (`media_id`);--> statement-breakpoint
CREATE TABLE `favorite_media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_favorite_media_user_media` ON `favorite_media` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_favorite_media_user` ON `favorite_media` (`user_id`);--> statement-breakpoint
CREATE TABLE `favorite_people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_favorite_people_user_person` ON `favorite_people` (`user_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `idx_favorite_people_user` ON `favorite_people` (`user_id`);--> statement-breakpoint
CREATE TABLE `genres` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_genre_tmdb` ON `genres` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `library_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`filed_status` text NOT NULL,
	`score100` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_library_user_media` ON `library_entries` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_library_user_updated` ON `library_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`overview` text,
	`tagline` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`last_air_date` text,
	`runtime` integer,
	`season_count` integer,
	`episode_count` integer,
	`status` text,
	`in_production` integer,
	`original_language` text,
	`certification` text,
	`imdb_id` text,
	`vote_average` real,
	`vote_count` integer,
	`popularity` real,
	`details_hydrated_at` integer,
	`details_error` text,
	`episodes_hydrated_at` integer,
	`episodes_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_slug_unique` ON `media` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_type_tmdb` ON `media` (`media_type`,`tmdb_id`);--> statement-breakpoint
CREATE INDEX `idx_media_type_popularity` ON `media` (`media_type`,`popularity`);--> statement-breakpoint
CREATE INDEX `idx_media_title` ON `media` (`title`);--> statement-breakpoint
CREATE TABLE `media_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`company_id` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_company` ON `media_companies` (`media_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_media_company_company` ON `media_companies` (`company_id`);--> statement-breakpoint
CREATE TABLE `media_genres` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`genre_id` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_genre` ON `media_genres` (`media_id`,`genre_id`);--> statement-breakpoint
CREATE INDEX `idx_media_genre_genre` ON `media_genres` (`genre_id`);--> statement-breakpoint
CREATE TABLE `media_titles` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`language_code` text NOT NULL,
	`title` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_title_lang` ON `media_titles` (`media_id`,`language_code`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`gender` integer,
	`known_for_department` text,
	`birthday` text,
	`deathday` text,
	`place_of_birth` text,
	`biography` text,
	`profile_path` text,
	`popularity` real,
	`imdb_id` text,
	`details_hydrated_at` integer,
	`details_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_slug_unique` ON `people` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_people_tmdb` ON `people` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `idx_people_popularity` ON `people` (`popularity`);--> statement-breakpoint
CREATE TABLE `watch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`media_type` text NOT NULL,
	`season_number` integer,
	`episode_number` integer,
	`watched_at` integer NOT NULL,
	`watched_on` text NOT NULL,
	`utc_offset_minutes` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_at` ON `watch_events` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_on` ON `watch_events` (`user_id`,`watched_on`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_media_episode` ON `watch_events` (`user_id`,`media_id`,`season_number`,`episode_number`);