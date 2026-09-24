-- AlterTable
ALTER TABLE "Rooms" ADD COLUMN     "current_album_art_url" TEXT,
ADD COLUMN     "current_artist_name" TEXT,
ADD COLUMN     "current_duration_ms" INTEGER,
ADD COLUMN     "current_track_name" TEXT;
