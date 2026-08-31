/**
 * Loading a .env file before reading variables.
 *
 * The Node-only loader lives in the `envy-ts/load` subpath so that the pure
 * parser entry point never pulls in `fs`/`path`.
 *
 * Create a file called `.env` next to this example with content such as:
 *
 *   GREETING=hello
 *   PORT=4000
 *
 * Run with:  npx tsx examples/env-file.ts
 */
import { env } from "../src";
import { loadEnv } from "../src/load";

loadEnv({ path: ".env", required: false });

const config = env.config({
  greeting: env.string("GREETING", "world"),
  port: env.number("PORT", 3000),
});

console.log(`${config.greeting} from port ${config.port}`);
console.log("Variables loaded from the file were merged into process.env.");
