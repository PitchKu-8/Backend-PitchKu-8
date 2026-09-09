// src/server.ts
import { env } from "@config/env";
import { logger } from "@shared/lib/logger";

import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(
    { action: "server:start", port: env.PORT, env: env.NODE_ENV },
    "Server is running",
  );
});
