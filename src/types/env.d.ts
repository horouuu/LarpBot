declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      APP_ID: string;
      TARGET_GUILD_ID: string;
      TARGET_CHANNEL_ID: string;
      MEMBER_ROLE_ID: string;
      ACTION_THRESHOLD: string;
      REDIS_URL: string;
    }
  }
}

export {};
