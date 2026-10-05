CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
