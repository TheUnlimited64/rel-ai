PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
INSERT INTO `__new_auth_tokens`("id", "name", "token_hash", "created_at", "last_used_at") SELECT "id", "name", "token_hash", "created_at", "last_used_at" FROM `auth_tokens`;--> statement-breakpoint
DROP TABLE `auth_tokens`;--> statement-breakpoint
ALTER TABLE `__new_auth_tokens` RENAME TO `auth_tokens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `__new_endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`token_hash` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_endpoints`("id", "name", "path", "token_hash", "enabled", "created_at", "updated_at") SELECT "id", "name", "path", "token_hash", "enabled", "created_at", "updated_at" FROM `endpoints`;--> statement-breakpoint
DROP TABLE `endpoints`;--> statement-breakpoint
ALTER TABLE `__new_endpoints` RENAME TO `endpoints`;--> statement-breakpoint
CREATE UNIQUE INDEX `endpoints_path_unique` ON `endpoints` (`path`);--> statement-breakpoint
CREATE TABLE `__new_models` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`type` text NOT NULL,
	`variant` text,
	`provider_id` text,
	`provider_model` text,
	`base_model_id` text,
	`fallback_chain` text,
	`overrides` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "models_type_check" CHECK("__new_models"."type" IN ('real', 'virtual')),
	CONSTRAINT "models_variant_check" CHECK("__new_models"."variant" IN ('fallback', 'tuned'))
);
--> statement-breakpoint
INSERT INTO `__new_models`("id", "display_name", "type", "variant", "provider_id", "provider_model", "base_model_id", "fallback_chain", "overrides", "created_at", "updated_at") SELECT "id", "display_name", "type", "variant", "provider_id", "provider_model", "base_model_id", "fallback_chain", "overrides", "created_at", "updated_at" FROM `models`;--> statement-breakpoint
DROP TABLE `models`;--> statement-breakpoint
ALTER TABLE `__new_models` RENAME TO `models`;--> statement-breakpoint
CREATE TABLE `__new_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`adapter_type` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_providers`("id", "name", "adapter_type", "base_url", "api_key", "enabled", "config", "created_at", "updated_at") SELECT "id", "name", "adapter_type", "base_url", "api_key", "enabled", "config", "created_at", "updated_at" FROM `providers`;--> statement-breakpoint
DROP TABLE `providers`;--> statement-breakpoint
ALTER TABLE `__new_providers` RENAME TO `providers`;--> statement-breakpoint
CREATE TABLE `__new_request_logs` (
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
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "request_logs_status_check" CHECK("__new_request_logs"."status" IN ('success', 'error', 'rate_limited'))
);
--> statement-breakpoint
INSERT INTO `__new_request_logs`("id", "endpoint_id", "requested_model", "resolved_model", "provider_id", "prompt_tokens", "completion_tokens", "latency_ms", "status", "error_detail", "created_at") SELECT "id", "endpoint_id", "requested_model", "resolved_model", "provider_id", "prompt_tokens", "completion_tokens", "latency_ms", "status", "error_detail", "created_at" FROM `request_logs`;--> statement-breakpoint
DROP TABLE `request_logs`;--> statement-breakpoint
ALTER TABLE `__new_request_logs` RENAME TO `request_logs`;--> statement-breakpoint
CREATE INDEX `idx_request_logs_endpoint` ON `request_logs` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_created` ON `request_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_provider` ON `request_logs` (`provider_id`);