CREATE TABLE "app_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320),
    "name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- Profiles are accessed by the trusted NestJS database connection only.
-- No Data API policies are granted to browser clients.
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;
