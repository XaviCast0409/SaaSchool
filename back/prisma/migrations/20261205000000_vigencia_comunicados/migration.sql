-- Vigencia de comunicados: el muro separa "Vigentes" y "Anteriores" según expiresAt
CREATE INDEX "Announcement_schoolId_isActive_expiresAt_idx" ON "Announcement"("schoolId", "isActive", "expiresAt");
