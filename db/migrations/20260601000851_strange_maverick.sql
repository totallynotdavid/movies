-- void:allow-destructive
DROP TABLE `users`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_favorite_media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_favorite_media`("id", "user_id", "media_id", "created_at") SELECT "id", "user_id", "media_id", "created_at" FROM `favorite_media`;--> statement-breakpoint
DROP TABLE `favorite_media`;--> statement-breakpoint
ALTER TABLE `__new_favorite_media` RENAME TO `favorite_media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_favorite_media_user_media` ON `favorite_media` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_favorite_media_user` ON `favorite_media` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_favorite_people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_favorite_people`("id", "user_id", "person_id", "created_at") SELECT "id", "user_id", "person_id", "created_at" FROM `favorite_people`;--> statement-breakpoint
DROP TABLE `favorite_people`;--> statement-breakpoint
ALTER TABLE `__new_favorite_people` RENAME TO `favorite_people`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_favorite_people_user_person` ON `favorite_people` (`user_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `idx_favorite_people_user` ON `favorite_people` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_library_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`status` text NOT NULL,
	`score100` integer,
	`notes` text,
	`last_watched_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_library_entries`("id", "user_id", "media_id", "status", "score100", "notes", "last_watched_at", "created_at", "updated_at") SELECT "id", "user_id", "media_id", "status", "score100", "notes", "last_watched_at", "created_at", "updated_at" FROM `library_entries`;--> statement-breakpoint
DROP TABLE `library_entries`;--> statement-breakpoint
ALTER TABLE `__new_library_entries` RENAME TO `library_entries`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_library_user_media` ON `library_entries` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `idx_library_user_updated` ON `library_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `__new_watch_events` (
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
INSERT INTO `__new_watch_events`("id", "user_id", "media_id", "media_type", "season_number", "episode_number", "watched_at", "watched_on", "utc_offset_minutes", "created_at") SELECT "id", "user_id", "media_id", "media_type", "season_number", "episode_number", "watched_at", "watched_on", "utc_offset_minutes", "created_at" FROM `watch_events`;--> statement-breakpoint
DROP TABLE `watch_events`;--> statement-breakpoint
ALTER TABLE `__new_watch_events` RENAME TO `watch_events`;--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_at` ON `watch_events` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_watched_on` ON `watch_events` (`user_id`,`watched_on`);--> statement-breakpoint
CREATE INDEX `idx_watch_user_media_episode` ON `watch_events` (`user_id`,`media_id`,`season_number`,`episode_number`);
