import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const e = process.env as { [key: string]: string };

const schema = {
  LOCALNET_RPC_URL: (x: string) => x,
  DEVNET_RPC_URL: (x: string) => x,
  MAINNET_RPC_URL: (x: string) => x,
};

// infer the Env type from the schema
type Env = {
  [K in keyof typeof schema]: ReturnType<(typeof schema)[K]>;
};

// load and parse env
export const ENV = {} as Env;

for (const key in schema) {
  const raw = e[key];

  if (typeof raw === "undefined") {
    throw new Error(`Missing environment variable: ${key}`);
  }

  (ENV as any)[key] = (schema as any)[key](raw);
}
