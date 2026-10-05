CREATE TABLE `income` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
