-- Pocket D1 SQLite Complete Schema Initializer
-- Use this file to set up a brand new Cloudflare D1 database in a single command:
-- wrangler d1 execute <your-database-name> --remote --file drizzle/schema.sql

CREATE TABLE IF NOT EXISTS `app_state` (
	`key` text PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);

CREATE TABLE IF NOT EXISTS `custom_categories` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`method` text DEFAULT '' NOT NULL,
	`account` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `budgets` (
	`category` text PRIMARY KEY NOT NULL,
	`cents` integer NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`cents` integer NOT NULL,
	`day` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`start_month` text NOT NULL,
	`last_month` text,
	`kind` text DEFAULT 'expense' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`account` text DEFAULT '' NOT NULL,
	`to_account` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `income` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`account` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`opening` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`maturity_date` text DEFAULT '' NOT NULL,
	`rate` integer DEFAULT 0 NOT NULL,
	`instalment` integer DEFAULT 0 NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_account` text NOT NULL,
	`to_account` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`cents` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target` integer NOT NULL,
	`target_date` text DEFAULT '' NOT NULL,
	`accounts` text DEFAULT '[]' NOT NULL,
	`saved` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);

CREATE TABLE IF NOT EXISTS `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`cents` integer DEFAULT 0 NOT NULL,
	`day` integer NOT NULL,
	`account` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`paid_month` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'admin' NOT NULL
);
