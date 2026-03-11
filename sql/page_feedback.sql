-- Page Feedback / Annotation Sistemi
-- Sayfa uzerinde geri bildirim kayitlari

CREATE TABLE IF NOT EXISTS "public"."page_feedback" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "page_url" varchar(500) NOT NULL,
    "feedback_text" text NOT NULL,
    "screenshot_url" text,
    "rect_x" integer NOT NULL,
    "rect_y" integer NOT NULL,
    "rect_width" integer NOT NULL,
    "rect_height" integer NOT NULL,
    "scroll_x" integer DEFAULT 0,
    "scroll_y" integer DEFAULT 0,
    "viewport_width" integer,
    "viewport_height" integer,
    "user_name" varchar(255),
    "status" varchar(20) DEFAULT 'open',
    "resolved_by" varchar(255),
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "page_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_page_feedback_page_url" ON "public"."page_feedback" ("page_url");
CREATE INDEX IF NOT EXISTS "idx_page_feedback_status" ON "public"."page_feedback" ("status");
CREATE INDEX IF NOT EXISTS "idx_page_feedback_created_at" ON "public"."page_feedback" ("created_at" DESC);

ALTER TABLE "public"."page_feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."page_feedback" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."page_feedback" FOR ALL TO authenticated USING (true) WITH CHECK (true);
