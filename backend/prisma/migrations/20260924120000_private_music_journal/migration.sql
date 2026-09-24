CREATE TABLE "JournalEntries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "artist" VARCHAR(200) NOT NULL,
  "listened_on" VARCHAR(10) NOT NULL,
  "mood" VARCHAR(20) NOT NULL,
  "rating" INTEGER,
  "note" VARCHAR(4000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntries_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
  CONSTRAINT "JournalEntries_mood_check" CHECK ("mood" IN ('calm', 'happy', 'energetic', 'melancholy', 'focused', 'nostalgic'))
);
CREATE INDEX "JournalEntries_user_id_listened_on_created_at_idx" ON "JournalEntries"("user_id", "listened_on", "created_at");
ALTER TABLE "JournalEntries" ADD CONSTRAINT "JournalEntries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
