import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  PORT: parseInt(process.env.PORT || "3001", 10),
};

const required = ["DATABASE_URL", "JWT_SECRET"] as const;
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}
