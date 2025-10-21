-- Migration: Remove redundant User.teamId field
-- This migration removes the User.teamId column since TeamMember table already handles team membership

-- Step 1: Migrate any existing User.teamId data to TeamMember table (if not already there)
-- Only insert if the relationship doesn't exist yet in TeamMember
INSERT INTO "TeamMember" ("id", "teamId", "userId", "role", "joinedAt", "updatedAt")
SELECT 
  gen_random_uuid() as "id",
  "teamId",
  "id" as "userId",
  'MEMBER' as "role",
  NOW() as "joinedAt",
  NOW() as "updatedAt"
FROM "User"
WHERE "teamId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "TeamMember" 
  WHERE "TeamMember"."userId" = "User"."id" 
  AND "TeamMember"."teamId" = "User"."teamId"
);

-- Step 2: Drop the foreign key constraint
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_teamId_fkey";

-- Step 3: Drop the teamId column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "teamId";

