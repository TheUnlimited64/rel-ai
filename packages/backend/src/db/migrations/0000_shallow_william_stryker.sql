CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `endpoint_models` (
	`endpoint_id` text NOT NULL,
	`model_id` text NOT NULL,
	PRIMARY KEY(`endpoint_id`, `model_id`),
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`token_hash` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `endpoints_path_unique` ON `endpoints` (`path`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`type` text NOT NULL,
	`variant` text,
	`provider_id` text,
	`provider_model` text,
	`base_model_id` text,
	`fallback_chain` text,
	`overrides` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "models_type_check" CHECK("models"."type" IN ('real', 'virtual')),
	CONSTRAINT "models_variant_check" CHECK("models"."variant" IN ('fallback', 'tuned'))
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`adapter_type` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text,
	`requested_model` text NOT NULL,
	`resolved_model` text,
	`provider_id` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`latency_ms` integer,
	`status` text NOT NULL,
	`error_detail` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "request_logs_status_check" CHECK("request_logs"."status" IN ('success', 'error', 'rate_limited'))
);
--> statement-breakpoint
CREATE INDEX `idx_request_logs_endpoint` ON `request_logs` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_created` ON `request_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_provider` ON `request_logs` (`provider_id`);