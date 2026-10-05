import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { listen, parsePort, startupErrorMessage } from "./lib/listen";

const port = parsePort(process.env["PORT"]);
const server = createServer(app);

try {
  await listen(server, port);
  logger.info({ port }, "Server listening");
} catch (error) {
  const err = error as NodeJS.ErrnoException;
  logger.error({ err, port }, startupErrorMessage(err, port));
  process.exit(1);
}
