-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_DATE,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_DATE,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_limit" DECIMAL(65,30) NOT NULL,
    "category_limits" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT '₹',
    "start_month" INTEGER NOT NULL DEFAULT 4,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "repeat_interval" TEXT NOT NULL,
    "next_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "recurring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_transactions_user_date" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_user_status" ON "transactions"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_transactions_user_type" ON "transactions"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_month_key" ON "budgets"("user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

