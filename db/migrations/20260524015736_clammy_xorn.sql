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
CREATE INDEX `idx_fav_media_user` ON `user_favorite_media` (`user_id`);