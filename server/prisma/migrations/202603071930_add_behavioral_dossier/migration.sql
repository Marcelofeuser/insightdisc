-- CreateTable
CREATE TABLE "behavioral_dossiers" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_notes" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_insights" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_plans" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reassessment_reminders" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reassessment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "behavioral_dossiers_candidate_id_workspace_id_key" ON "behavioral_dossiers"("candidate_id", "workspace_id");

-- CreateIndex
CREATE INDEX "behavioral_dossiers_workspace_id_created_at_idx" ON "behavioral_dossiers"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "behavioral_dossiers_candidate_id_created_at_idx" ON "behavioral_dossiers"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "dossier_notes_dossier_id_created_at_idx" ON "dossier_notes"("dossier_id", "created_at");

-- CreateIndex
CREATE INDEX "dossier_insights_dossier_id_created_at_idx" ON "dossier_insights"("dossier_id", "created_at");

-- CreateIndex
CREATE INDEX "development_plans_dossier_id_created_at_idx" ON "development_plans"("dossier_id", "created_at");

-- CreateIndex
CREATE INDEX "reassessment_reminders_dossier_id_date_idx" ON "reassessment_reminders"("dossier_id", "date");

-- AddForeignKey
ALTER TABLE "behavioral_dossiers" ADD CONSTRAINT "behavioral_dossiers_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_dossiers" ADD CONSTRAINT "behavioral_dossiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_dossiers" ADD CONSTRAINT "behavioral_dossiers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_notes" ADD CONSTRAINT "dossier_notes_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "behavioral_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_insights" ADD CONSTRAINT "dossier_insights_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "behavioral_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "behavioral_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reassessment_reminders" ADD CONSTRAINT "reassessment_reminders_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "behavioral_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
