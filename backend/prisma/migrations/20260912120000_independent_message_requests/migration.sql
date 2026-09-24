-- Preserve all existing conversations and messages, including their consent.
CREATE TYPE "ConversationStatus" AS ENUM ('ACCEPTED', 'PENDING', 'DECLINED');
ALTER TABLE "Conversations"
  ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'ACCEPTED',
  ADD COLUMN "initiated_by" TEXT,
  ADD COLUMN "invitation_sent" BOOLEAN NOT NULL DEFAULT false;
