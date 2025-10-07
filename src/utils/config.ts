import dotenv from "dotenv";
import { z } from "zod";
import { snakeToCamel, SnakeToCamel } from "@utils";
let variableStore = "environment variables";
if (process.env.NODE_ENV !== "production") {
  variableStore = ".env";
  dotenv.config();
}

if (!process.env.ACTION_THRESHOLD)
  console.warn(
    `ACTION_THRESHOLD not defined in ${variableStore}. Using default value of 3.`
  );

const EnvSchema = z.object({
  TOKEN: z.string().min(1, `Missing TOKEN value in ${variableStore}`),
  APP_ID: z.string().min(1, `Missing APP_ID value in ${variableStore}`),
  ACTION_THRESHOLD: z.coerce.number<number>().int().positive().default(3),
  REDIS_URL: z.string().min(1, `Missing REDIS_URL in ${variableStore}`),
});
const configVars = [
  "TOKEN",
  "APP_ID",
  "ACTION_THRESHOLD",
  "REDIS_URL",
] as const;

type Env = z.infer<typeof EnvSchema>;
type EnvAccessors = {
  [K in keyof Env as SnakeToCamel<K & string>]: Env[K];
};

export type ConfigType = EnvAccessors;
export class Config {
  private _env: Env;

  constructor() {
    try {
      const parsed = EnvSchema.parse(process.env);
      this._env = parsed;
    } catch (e) {
      console.error(e);
      throw new Error("Parsing process.env with EnvSchema failed.");
    }

    for (const k of configVars) {
      Object.defineProperty(this, snakeToCamel(k), {
        get: () => this._env[k],
        enumerable: true,
        configurable: false,
      });
    }
  }
}

export interface Config extends EnvAccessors {}
