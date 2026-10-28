-- CHECK constraints (contracts 1.9) are added by hand: Prisma does not model them.

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ledger_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ledgerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isCoordinator" BOOLEAN NOT NULL DEFAULT false,
    "paymentDetails" TEXT,
    "linkToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_position_check" CHECK ("position" BETWEEN 1 AND 20)
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ledgerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "payerId" TEXT NOT NULL,
    "splitMode" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_amountKopecks_check" CHECK ("amountKopecks" BETWEEN 1 AND 99999999)
);

-- CreateTable
CREATE TABLE "Share" (
    "expenseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "percentBp" INTEGER,

    PRIMARY KEY ("expenseId", "memberId"),
    CONSTRAINT "Share_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Share_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Share_amountKopecks_check" CHECK ("amountKopecks" >= 1),
    CONSTRAINT "Share_percentBp_check" CHECK ("percentBp" IS NULL OR "percentBp" BETWEEN 1 AND 10000)
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ledgerId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "amountKopecks" BIGINT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedVia" TEXT,
    "reportedAt" DATETIME,
    "confirmedVia" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transfer_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transfer_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_amountKopecks_check" CHECK ("amountKopecks" >= 1),
    CONSTRAINT "Transfer_parties_check" CHECK ("fromMemberId" <> "toMemberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Ledger_coordinatorId_idx" ON "Ledger"("coordinatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_linkToken_key" ON "Member"("linkToken");

-- CreateIndex
CREATE UNIQUE INDEX "Member_ledgerId_nameKey_key" ON "Member"("ledgerId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Member_ledgerId_position_key" ON "Member"("ledgerId", "position");

-- CreateIndex
CREATE INDEX "Expense_ledgerId_createdAt_idx" ON "Expense"("ledgerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_ledgerId_clientRequestId_key" ON "Expense"("ledgerId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_ledgerId_fromMemberId_toMemberId_key" ON "Transfer"("ledgerId", "fromMemberId", "toMemberId");
