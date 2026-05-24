CREATE TABLE IF NOT EXISTS `library_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`status` text NOT NULL,
	`score100` integer,
	`progress_current` integer DEFAULT 0 NOT NULL,
	`progress_total` integer,
	`notes` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uq_library_user_media` ON `library_entries` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_library_user_updated` ON `library_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `media` (
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
	`vote_average` real,
	`vote_count` integer,
	`popularity` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `media_slug_unique` ON `media` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uq_media_provider_provider_id` ON `media` (`provider`,`provider_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_media_type_popularity` ON `media` (`media_type`,`popularity`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_media_title` ON `media` (`title`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
