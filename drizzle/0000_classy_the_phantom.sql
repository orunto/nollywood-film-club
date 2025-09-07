CREATE TYPE "public"."content_type" AS ENUM('movie', 'tv_show');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA');--> statement-breakpoint
CREATE TYPE "public"."streaming_platform" AS ENUM('netflix', 'prime_video', 'disney_plus', 'hulu', 'hbo_max', 'apple_tv', 'paramount_plus', 'peacock', 'other');--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content_type" "content_type" NOT NULL,
	"runtime" integer,
	"release_date" timestamp,
	"rating" "rating",
	"synopsis" text,
	"genre" text[],
	"poster_image" text,
	"trailer_url" text,
	"streaming_url" text,
	"streaming_platform" "streaming_platform",
	"other_platform" text,
	"space_url" text,
	"podcast_links" text[],
	"is_movie_of_the_week" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"score" numeric(2, 1),
	"reviewer" text NOT NULL,
	"external_url" text,
	"review_image" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid,
	"user_id" text NOT NULL,
	"rating" numeric(2, 1),
	"review" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;