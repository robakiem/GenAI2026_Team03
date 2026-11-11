import type { Prisma } from "./generated/client";

// Accepts either the Prisma client or an interactive-transaction client,
// so a repository call can run inside or outside a transaction.
export type Db = Prisma.TransactionClient;
