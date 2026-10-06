CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`opening` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_account` text NOT NULL,
	`to_account` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `account` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `income` ADD `account` text DEFAULT '' NOT NULL;