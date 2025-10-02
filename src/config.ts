import dotenv from "dotenv";
import { z } from "zod";
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
  TARGET_GUILD_ID: z
    .string()
    .min(1, `Missing TARGET_GUILD_ID in ${variableStore}`),
  TARGET_CHANNEL_ID: z
    .string()
    .min(1, `Missing TARGET_CHANNEL_ID in ${variableStore}`),
  MEMBER_ROLE_ID: z
    .string()
    .min(1, `Missing MEMBER_ROLE_ID in ${variableStore}`),
  ACTION_THRESHOLD: z.coerce.number<number>().int().positive().default(3),
  REDIS_USERNAME: z
    .string()
    .min(1, `Missing REDIS_USERNAME in ${variableStore}`),
  REDIS_PASSWORD: z
    .string()
    .min(1, `Missing REDIS_PASSWORD in ${variableStore}`),
});
const configVars = [
  "TOKEN",
  "APP_ID",
  "TARGET_GUILD_ID",
  "TARGET_CHANNEL_ID",
  "MEMBER_ROLE_ID",
  "ACTION_THRESHOLD",
  "REDIS_USERNAME",
  "REDIS_PASSWORD",
] as const;

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Lowercase<Head>}${Capitalize<SnakeToCamel<Tail>>}`
  : `${Lowercase<S>}`;

type Env = z.infer<typeof EnvSchema>;
type EnvAccessors = {
  [K in keyof Env as SnakeToCamel<K & string>]: Env[K];
};

function snakeToCamel<T extends string>(str: T): SnakeToCamel<T> {
  return str
    .split("_")
    .map((s, i) =>
      i == 0
        ? s.toLowerCase()
        : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    )
    .join("") as SnakeToCamel<T>;
}

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

const config = new Config();
console.log(config.actionThreshold);
