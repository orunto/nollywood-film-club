ALTER TYPE "public"."rating" ADD VALUE IF NOT EXISTS '13' AFTER 'PG-13';--> statement-breakpoint
ALTER TYPE "public"."rating" ADD VALUE IF NOT EXISTS '16' AFTER 'R';--> statement-breakpoint
ALTER TYPE "public"."rating" ADD VALUE IF NOT EXISTS '18+' AFTER 'NC-17';
