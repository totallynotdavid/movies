CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`media_id` text NOT NULL,
	`kind` text NOT NULL,
	`media_type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`episode_number` integer,
	`progress_current` integer,
	`progress_total` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activity_user_occurred_at` ON `activity_events` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_user_occurred_on` ON `activity_events` (`user_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `idx_activity_user_media_occurred_at` ON `activity_events` (`user_id`,`media_id`,`occurred_at`);--> statement-breakpoint
ALTER TABLE `media` ADD `season_count` integer;--> statement-breakpoint
ALTER TABLE `media` ADD `episode_count` integer;