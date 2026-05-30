CREATE TABLE `library_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`status` text NOT NULL,
	`score100` integer,
	`notes` text,
	`episodes_watched` integer DEFAULT 0 NOT NULL,
	`last_watched_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_library_user_media` ON `library_entries` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_library_user_updated` ON `library_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`provider` text DEFAULT 'tmdb' NOT NULL,
	`provider_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`season_count` integer,
	`episode_count` integer,
	`vote_average` real,
	`vote_count` integer,
	`popularity` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_slug_unique` ON `media` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_provider_provider_id` ON `media` (`provider`,`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_media_type_popularity` ON `media` (`media_type`,`popularity`);--> statement-breakpoint
CREATE INDEX `idx_media_title` ON `media` (`title`);--> statement-breakpoint
CREATE TABLE `user_favorite_actors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_tmdb_id` integer NOT NULL,
	`actor_name` text NOT NULL,
	`actor_profile_path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_fav_actor_user_actor` ON `user_favorite_actors` (`user_id`,`actor_tmdb_id`);--> statement-breakpoint
CREATE INDEX `idx_fav_actor_user` ON `user_favorite_actors` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_favorite_media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_fav_media_user_media` ON `user_favorite_media` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_fav_media_user` ON `user_favorite_media` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`rating_system` text DEFAULT 'score100' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `watch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`media_type` text NOT NULL,
	`watched_at` integer NOT NULL,
	`watched_on` text NOT NULL,
	`episode_ordinal` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_at` ON `watch_events` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_on` ON `watch_events` (`user_id`,`watched_on`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_media_watched_at` ON `watch_events` (`user_id`,`media_id`,`watched_at`);