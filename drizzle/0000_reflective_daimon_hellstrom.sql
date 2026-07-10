CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cambridge_books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_set_id` text,
	`date` text NOT NULL,
	`skill` text NOT NULL,
	`raw_score` integer,
	`band_score` real NOT NULL,
	`notes` text,
	`duration` integer,
	`confidence` text DEFAULT 'Medium' NOT NULL,
	FOREIGN KEY (`practice_set_id`) REFERENCES `practice_sets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `practice_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` integer,
	`test_number` integer,
	`module_skill` text NOT NULL,
	`status` text DEFAULT 'Unstarted' NOT NULL,
	`target_date` text,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`is_custom` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `cambridge_books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `study_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`target_listening` real DEFAULT 6.5 NOT NULL,
	`target_reading` real DEFAULT 6.5 NOT NULL,
	`target_writing` real DEFAULT 6.5 NOT NULL,
	`target_speaking` real DEFAULT 6.5 NOT NULL,
	`target_overall` real DEFAULT 6.5 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
