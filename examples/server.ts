/**
 * A realistic production configuration, bundled with `env.config`.
 *
 * Requires a DATABASE_URL to be set and throws a clear error if it is not.
 *
 * Run with:  PORT=8080 NODE_ENV=production DATABASE_URL=postgres://... npx tsx examples/server.ts
 */
import { createServer } from "node:http";
import { env } from "../src";

const config = env.config({
  port: env.number("PORT", { default: 3000, min: 1, max: 65535 }),
  host: env.string("HOST", "0.0.0.0"),
  nodeEnv: env.enum("NODE_ENV", ["development", "production", "test"] as const, "development"),
  debug: env.boolean("DEBUG", false),
  databaseUrl: env.url("DATABASE_URL"),
  uploadLimitBytes: env.bigint("UPLOAD_LIMIT_BYTES", 5_000_000n),
  featureFlags: env.optional.string("FEATURE_FLAGS"),
  retryCount: env.number("RETRY_COUNT", { default: 3, min: 0, max: 10, integer: true }),
});

console.log("Loaded configuration:", {
  port: config.port,
  host: config.host,
  nodeEnv: config.nodeEnv,
  debug: config.debug,
  databaseHost: config.databaseUrl.hostname,
  uploadLimitBytes: config.uploadLimitBytes,
  retryCount: config.retryCount,
});

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, env: config.nodeEnv }));
});

async function main(): Promise<void> {
  await new Promise<void>((resolve) => server.listen(config.port, config.host, resolve));
  const address = server.address();
  const host = typeof address === "object" && address !== null ? address.address : config.host;
  const port = typeof address === "object" && address !== null ? address.port : config.port;
  console.log(`Listening on http://${host}:${port}`);

  // Self-check: hit the running server once, then shut it down so the example
  // terminates. In a real application you would leave the server running.
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = (await response.json()) as { ok: boolean };
  console.log(`Self-check response: ${JSON.stringify(body)}`);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  server.closeAllConnections();
}

main()
  .then(() => console.log("Server shut down cleanly."))
  .catch((error: unknown) => {
    console.error("Example failed:", error);
    server.close();
    process.exitCode = 1;
  });
