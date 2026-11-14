-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('NEW', 'INTERVIEW', 'ADMITTED', 'ENROLLED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RatificationDecision" AS ENUM ('CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "DocumentRequestType" AS ENUM ('CONSTANCIA_ESTUDIOS', 'CONSTANCIA_MATRICULA', 'CONSTANCIA_CONDUCTA', 'CONSTANCIA_NO_ADEUDO', 'CERTIFICADO_ESTUDIOS', 'LIBRETA_NOTAS', 'OTRO');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('REQUESTED', 'IN_PROCESS', 'READY', 'DELIVERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintKind" AS ENUM ('RECLAMO', 'QUEJA');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ANSWERED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "admissionsMessage" TEXT,
ADD COLUMN     "admissionsOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "admissionsYear" INTEGER,
ADD COLUMN     "complaintCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratificationDeadline" DATE,
ADD COLUMN     "ratificationOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratificationYear" INTEGER;

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'NEW',
    "targetYear" INTEGER NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "grade" INTEGER NOT NULL,
    "studentFirstNames" TEXT NOT NULL,
    "studentLastNamePaternal" TEXT NOT NULL,
    "studentLastNameMaternal" TEXT,
    "studentDocumentType" "DocumentType" NOT NULL DEFAULT 'DNI',
    "studentDocumentId" TEXT NOT NULL,
    "studentBirthDate" DATE NOT NULL,
    "studentGender" "Gender" NOT NULL,
    "previousSchool" TEXT,
    "guardianFirstName" TEXT NOT NULL,
    "guardianLastNames" TEXT NOT NULL,
    "guardianDocumentId" TEXT,
    "guardianRelation" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "guardianEmail" TEXT,
    "familyNotes" TEXT,
    "staffNotes" TEXT,
    "interviewAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentRatification" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetYear" INTEGER NOT NULL,
    "decision" "RatificationDecision" NOT NULL,
    "comment" TEXT,
    "ratifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentRatification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "DocumentRequestType" NOT NULL,
    "purpose" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "debtHold" BOOLEAN NOT NULL DEFAULT false,
    "staffNote" TEXT,
    "fileUrl" TEXT,
    "handledById" TEXT,
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "ComplaintKind" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "consumerName" TEXT NOT NULL,
    "consumerDocType" TEXT NOT NULL,
    "consumerDocId" TEXT NOT NULL,
    "consumerAddress" TEXT,
    "consumerPhone" TEXT,
    "consumerEmail" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "itemType" TEXT NOT NULL DEFAULT 'SERVICIO',
    "itemDescription" TEXT NOT NULL,
    "amount" TEXT,
    "detail" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_status_idx" ON "AdmissionApplication"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_studentDocumentId_idx" ON "AdmissionApplication"("schoolId", "studentDocumentId");

-- CreateIndex
CREATE INDEX "EnrollmentRatification_schoolId_targetYear_idx" ON "EnrollmentRatification"("schoolId", "targetYear");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRatification_studentId_targetYear_key" ON "EnrollmentRatification"("studentId", "targetYear");

-- CreateIndex
CREATE INDEX "DocumentRequest_schoolId_status_idx" ON "DocumentRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "DocumentRequest_studentId_idx" ON "DocumentRequest"("studentId");

-- CreateIndex
CREATE INDEX "Complaint_schoolId_status_idx" ON "Complaint"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_schoolId_code_key" ON "Complaint"("schoolId", "code");

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRatification" ADD CONSTRAINT "EnrollmentRatification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRatification" ADD CONSTRAINT "EnrollmentRatification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRatification" ADD CONSTRAINT "EnrollmentRatification_ratifiedById_fkey" FOREIGN KEY ("ratifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

