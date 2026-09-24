-- AlterEnum
ALTER TYPE "NotificationActions" ADD VALUE 'room_invited';

-- AlterTable
ALTER TABLE "SpotifyAccounts" ADD COLUMN     "product" TEXT,
ADD COLUMN     "scope" TEXT;

-- CreateTable
CREATE TABLE "Rooms" (
    "id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "current_track_uri" TEXT,
    "position_ms" INTEGER NOT NULL DEFAULT 0,
    "is_playing" BOOLEAN NOT NULL DEFAULT false,
    "position_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomParticipants" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomParticipants_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "RoomQueueItems" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "added_by_id" TEXT NOT NULL,
    "track_uri" TEXT NOT NULL,
    "track_name" TEXT NOT NULL,
    "artist_name" TEXT NOT NULL,
    "album_art_url" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomQueueItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipants" ADD CONSTRAINT "RoomParticipants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipants" ADD CONSTRAINT "RoomParticipants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomQueueItems" ADD CONSTRAINT "RoomQueueItems_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomQueueItems" ADD CONSTRAINT "RoomQueueItems_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
