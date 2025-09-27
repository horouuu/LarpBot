declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      APP_ID: string;
      TARGET_GUILD_ID: string;
      TARGET_CHANNEL_ID: string;
    }
  }
}

export {};
