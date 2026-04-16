CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'shop_owner', 'worker', 'customer');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'trial');--> statement-breakpoint
CREATE TYPE "public"."tool_status" AS ENUM('available', 'rented', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('click', 'payme', 'paynet', 'cash');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('active', 'returned', 'overdue', 'completed');--> statement-breakpoint
CREATE TYPE "public"."payment_method2" AS ENUM('click', 'payme', 'paynet', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('rental', 'deposit', 'deposit_refund', 'damage_deduction');--> statement-breakpoint
CREATE TYPE "public"."wallet_provider" AS ENUM('click', 'payme', 'paynet', 'cash', 'system');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('topup', 'payment', 'deposit_hold', 'deposit_release', 'deposit_deduct', 'refund', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."fund_status" AS ENUM('active', 'closed', 'matured', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."investment_status" AS ENUM('active', 'returned', 'cancelled');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"phone" text NOT NULL,
	"email" text,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"shop_id" integer,
	"region" text,
	"district" text,
	"address" text,
	"home_lat" text,
	"home_lng" text,
	"preferred_lang" text DEFAULT 'uz',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"owner_id" integer NOT NULL,
	"region" text,
	"district" text,
	"plan_id" integer,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"subscription_ends_at" timestamp,
	"commission" real DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"shop_id" integer NOT NULL,
	"price_per_day" real NOT NULL,
	"deposit_amount" real NOT NULL,
	"status" "tool_status" DEFAULT 'available' NOT NULL,
	"qr_code" text NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"worker_id" integer,
	"status" "rental_status" DEFAULT 'active' NOT NULL,
	"rental_price" real NOT NULL,
	"deposit_amount" real NOT NULL,
	"total_amount" real NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"returned_at" timestamp,
	"due_date" timestamp NOT NULL,
	"damage_note" text,
	"damage_cost" real,
	"verification_type" text,
	"id_front_url" text,
	"id_back_url" text,
	"selfie_url" text,
	"verification_status" text DEFAULT 'pending',
	"contract_signed" boolean DEFAULT false,
	"contract_signed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"rental_id" integer NOT NULL,
	"amount" real NOT NULL,
	"method" "payment_method2" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"type" "payment_type" NOT NULL,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_uz" text NOT NULL,
	"price" real NOT NULL,
	"max_tools" integer DEFAULT 30 NOT NULL,
	"max_workers" integer DEFAULT 3 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"rental_id" integer,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'eskiz' NOT NULL,
	"template_type" text,
	"lang" text DEFAULT 'uz',
	"provider_message_id" text,
	"error_message" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"provider" text DEFAULT 'eskiz' NOT NULL,
	"label" text,
	"country" text DEFAULT 'uz',
	"email" text,
	"password" text,
	"api_key" text,
	"token" text,
	"token_expires_at" timestamp,
	"sender_id" text DEFAULT '4546' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer,
	"name" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"lang" text DEFAULT 'uz' NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rental_id" integer,
	"amount" real NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"provider" "wallet_provider" DEFAULT 'system' NOT NULL,
	"status" "wallet_tx_status" DEFAULT 'pending' NOT NULL,
	"reference_id" text,
	"provider_tx_id" text,
	"description" text,
	"balance_before" real DEFAULT 0 NOT NULL,
	"balance_after" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" real DEFAULT 0 NOT NULL,
	"escrow_balance" real DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tool_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"rental_id" integer,
	"actor_id" integer,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cost" numeric(14, 2),
	"performed_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investment_funds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tool_type" text NOT NULL,
	"shop_id" integer,
	"target_amount" real NOT NULL,
	"collected_amount" real DEFAULT 0 NOT NULL,
	"annual_return_rate" real NOT NULL,
	"duration_months" integer NOT NULL,
	"min_investment" real DEFAULT 500000 NOT NULL,
	"status" "fund_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"fund_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" real NOT NULL,
	"share_percent" real DEFAULT 0 NOT NULL,
	"earned_amount" real DEFAULT 0 NOT NULL,
	"status" "investment_status" DEFAULT 'active' NOT NULL,
	"invested_at" timestamp DEFAULT now(),
	"returned_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
