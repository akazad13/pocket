CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`cents` integer NOT NULL,
	`day` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`start_month` text NOT NULL,
	`last_month` text
);
