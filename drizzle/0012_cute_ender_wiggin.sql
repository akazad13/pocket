CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target` integer NOT NULL,
	`target_date` text DEFAULT '' NOT NULL,
	`accounts` text DEFAULT '[]' NOT NULL,
	`saved` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
