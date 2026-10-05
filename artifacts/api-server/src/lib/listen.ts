import type { Server } from "node:http";

export function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }
  if (!/^\d+$/.test(rawPort)) {
    throw new Error("Invalid PORT value. Expected an integer from 1 to 65535.");
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PORT value. Expected an integer from 1 to 65535.");
  }
  return port;
}

export function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.removeListener("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
}

export function startupErrorMessage(error: NodeJS.ErrnoException, port: number): string {
  if (error.code !== "EADDRINUSE") {
    return `API Server could not listen on 0.0.0.0:${port} (${error.code ?? "unknown error"}).`;
  }
  return (
    `API Server cannot start: port ${port} is already in use. No process was stopped. ` +
    'Check the managed workflow "artifacts/api-server: API Server" and the Networking tool ' +
    "to establish the listener's owner before stopping or restarting anything. " +
    "If the owner is not visible, do not reclaim the port; resolve the runtime conflict first. " +
    "Keep PORT and the API artifact service localPort aligned; do not switch to an arbitrary port."
  );
}
