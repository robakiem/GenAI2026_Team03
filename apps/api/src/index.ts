import { createApp } from "./app";
import { config } from "./config";
import { pingDatabase } from "./data/db";

createApp({ pingDatabase }).listen(config.port, () => {
  console.log(`Babki API listening on http://localhost:${config.port}`);
});
