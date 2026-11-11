import { createApp } from "./app";
import { config } from "./config";
import { pingDatabase, prisma } from "./data/db";

createApp({ pingDatabase, prisma }).listen(config.port, () => {
  console.log(`Babki API listening on http://localhost:${config.port}`);
});
