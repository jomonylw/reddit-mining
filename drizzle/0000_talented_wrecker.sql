CREATE TABLE `industries` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pain_point_tags` (
	`pain_point_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`pain_point_id`, `tag_id`),
	FOREIGN KEY (`pain_point_id`) REFERENCES `pain_points`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pain_point_tags_pain_point_id` ON `pain_point_tags` (`pain_point_id`);--> statement-breakpoint
CREATE INDEX `idx_pain_point_tags_tag_id` ON `pain_point_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `pain_point_types` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pain_points` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`user_need` text,
	`current_solution` text,
	`ideal_solution` text,
	`mentioned_competitors` text,
	`quotes` text,
	`target_personas` text,
	`actionable_insights` text,
	`industry_code` text,
	`type_code` text,
	`confidence` real DEFAULT 0 NOT NULL,
	`total_score` real DEFAULT 0 NOT NULL,
	`score_urgency` integer DEFAULT 0 NOT NULL,
	`score_frequency` integer DEFAULT 0 NOT NULL,
	`score_market_size` integer DEFAULT 0 NOT NULL,
	`score_monetization` integer DEFAULT 0 NOT NULL,
	`score_barrier_to_entry` integer DEFAULT 0 NOT NULL,
	`dimension_reasons` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`industry_code`) REFERENCES `industries`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`type_code`) REFERENCES `pain_point_types`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pain_points_post_id_unique` ON `pain_points` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_post_id` ON `pain_points` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_industry_code` ON `pain_points` (`industry_code`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_type_code` ON `pain_points` (`type_code`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_total_score` ON `pain_points` (`total_score`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_score_urgency` ON `pain_points` (`score_urgency`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_score_monetization` ON `pain_points` (`score_monetization`);--> statement-breakpoint
CREATE INDEX `idx_pain_points_created_at` ON `pain_points` (`created_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`subreddit_id` text,
	`reddit_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`author` text,
	`url` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`num_comments` integer DEFAULT 0 NOT NULL,
	`reddit_created_at` text NOT NULL,
	`process_status` text DEFAULT 'pending' NOT NULL,
	`processed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`subreddit_id`) REFERENCES `subreddits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_reddit_id_unique` ON `posts` (`reddit_id`);--> statement-breakpoint
CREATE INDEX `idx_posts_reddit_id` ON `posts` (`reddit_id`);--> statement-breakpoint
CREATE INDEX `idx_posts_subreddit_id` ON `posts` (`subreddit_id`);--> statement-breakpoint
CREATE INDEX `idx_posts_process_status` ON `posts` (`process_status`);--> statement-breakpoint
CREATE INDEX `idx_posts_created_at` ON `posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `subreddits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`fetch_frequency` text DEFAULT 'daily' NOT NULL,
	`posts_limit` integer DEFAULT 100 NOT NULL,
	`last_fetched_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subreddits_name_unique` ON `subreddits` (`name`);--> statement-breakpoint
CREATE INDEX `idx_subreddits_name` ON `subreddits` (`name`);--> statement-breakpoint
CREATE INDEX `idx_subreddits_is_active` ON `subreddits` (`is_active`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tags_name` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tags_usage_count` ON `tags` (`usage_count`);