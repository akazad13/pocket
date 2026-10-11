CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `adjustments` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `budgets` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_categories` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `income` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring` ADD `user_id` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `transfers` ADD `user_id` text DEFAULT 'admin' NOT NULL;