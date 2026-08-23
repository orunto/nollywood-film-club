CREATE TABLE IF NOT EXISTS `account_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `account_claims_token_hash_unique` ON `account_claims` (`token_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `account_claims_user_id_idx` ON `account_claims` (`user_id`);
