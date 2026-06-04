CREATE TABLE `model_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`interface_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`interface_id`) REFERENCES `model_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `group_entries` (
	`group_id` text NOT NULL,
	`virtual_name` text NOT NULL,
	`model_id` text,
	PRIMARY KEY(`group_id`, `virtual_name`),
	FOREIGN KEY (`group_id`) REFERENCES `model_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `endpoint_groups` (
	`endpoint_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`endpoint_id`, `group_id`),
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `model_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
