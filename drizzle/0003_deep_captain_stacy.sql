ALTER TABLE `cambridge_books` ADD `is_custom` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `cambridge_books` SET `is_custom` = 1, `number` = 0 WHERE `number` = 99;
