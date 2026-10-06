CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`cents` integer DEFAULT 0 NOT NULL,
	`day` integer NOT NULL,
	`account` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`paid_month` text DEFAULT '' NOT NULL
);
