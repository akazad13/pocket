ALTER TABLE `recurring` ADD `kind` text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring` ADD `source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring` ADD `account` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring` ADD `to_account` text DEFAULT '' NOT NULL;