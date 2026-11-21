ALTER TABLE "public"."User"
ADD COLUMN "passwordResetAttempts" INTEGER NOT NULL DEFAULT 0;
