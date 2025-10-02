import dotenv from "dotenv";

let token: string;
let appId: string;
let targetGuildId: string;
let targetChannelId: string;
let memberRoleId: string;
let actionThreshold: number;

let redisUsername: string;
let redisPassword: string;

let variableStore = "environment variables";

function assertLoaded<T>(val: T | undefined, name: string) {
  if (!val)
    throw new Error(
      `${name} accessed before loadConfig() is called. Use the function before using Config.`
    );

  return val;
}

export type Config = {
  actionThreshold: number;
  token: string;
  appId: string;
  targetGuildId: string;
  targetChannelId: string;
  memberRoleId: string;
  redisUsername: string;
  redisPassword: string;
};

export const Config = {
  load() {
    if (process.env.NODE_ENV !== "production") {
      dotenv.config();
      variableStore = ".env";
    }

    if (!process.env.ACTION_THRESHOLD)
      console.warn(
        `ACTION_THRESHOLD not defined in ${variableStore}. Using default value of 3.`
      );
    actionThreshold = Number(process.env.ACTION_THRESHOLD ?? "3");

    if (!process.env.TOKEN)
      throw new Error(`Missing TOKEN value in ${variableStore}.`);
    if (!process.env.APP_ID)
      throw new Error(`Missing APP_ID value in ${variableStore}.`);
    if (!process.env.TARGET_GUILD_ID)
      throw new Error(`Missing TARGET_GUILD_ID value in ${variableStore}.`);
    if (!process.env.TARGET_CHANNEL_ID)
      throw new Error(`Missing TARGET_CHANNEL_ID value in ${variableStore}`);
    if (!process.env.MEMBER_ROLE_ID)
      throw new Error(`Missing MEMBER_ROLE_ID value in ${variableStore}`);
    if (!process.env.REDIS_USERNAME)
      throw new Error(`Missing REDIS_USERNAME value in ${variableStore}`);
    if (!process.env.REDIS_PASSWORD)
      throw new Error(`Missing REDIS_PASSWORD avlue in ${variableStore}`);
    token = process.env.TOKEN;
    appId = process.env.APP_ID;
    targetGuildId = process.env.TARGET_GUILD_ID;
    targetChannelId = process.env.TARGET_CHANNEL_ID;
    memberRoleId = process.env.MEMBER_ROLE_ID;
    redisUsername = process.env.REDIS_USERNAME;
    redisPassword = process.env.REDIS_PASSWORD;
  },
  get actionThreshold() {
    return assertLoaded<number>(actionThreshold, "ACTION_THRESHOLD");
  },
  get token() {
    return assertLoaded<string>(token, "TOKEN");
  },
  get appId() {
    return assertLoaded<string>(appId, "APP_ID");
  },
  get targetGuildId() {
    return assertLoaded<string>(targetGuildId, "TARGET_GUILD_ID");
  },
  get targetChannelId() {
    return assertLoaded<string>(targetChannelId, "TARGET_CHANNEL_ID");
  },
  get memberRoleId() {
    return assertLoaded<string>(memberRoleId, "MEMBER_ROLE_ID");
  },
  get redisUsername() {
    return assertLoaded<string>(redisUsername, "REDIS_USERNAME");
  },
  get redisPassword() {
    return assertLoaded<string>(redisPassword, "REDIS_PASSWORD");
  },
} as const;
