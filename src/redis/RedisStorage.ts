import { createClient } from "redis";
import { ConfigType } from "@config";

type PersistedConfigs = Pick<ConfigType, "actionThreshold">;
type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Omit<T, K>;
}[keyof T];
export class RedisStorage {
  private client: ReturnType<typeof createClient>;

  private constructor(client: typeof this.client) {
    this.client = client;
  }

  public static async create(config: ConfigType) {
    const client = createClient({
      password: config.redisPassword,
    });

    client.on("err", (e) => console.error(e));
    await client.connect();

    return new RedisStorage(client);
  }

  private async set(key: string, value: string): Promise<void> {
    try {
      await this.client.set(key, value);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async get(key: string): Promise<string> {
    try {
      const res = (await this.client.get(key)) as string;
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  public async registerConfigs(
    guildId: string,
    configs: AtLeastOne<PersistedConfigs>
  ) {
    for (const [key, value] of Object.entries(configs)) {
      const redisKey: string = `${guildId}:${key}`;
      await this.set(redisKey, value.toString());
    }
  }

  public async destroy(): Promise<void> {
    await this.client.close();
  }
}
