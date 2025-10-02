import { createClient } from "redis";
import { ConfigType } from "@config";
import {
  persistedConfigs,
  PersistedConfigs,
  PersistedKey,
  Storage,
} from "@storage";
import { AtLeastOne, OrNullEntries } from "@types-local/util";

const REDIS_NAMESPACE_GUILDS = "guilds";
const REDIS_NAMESPACE_CONFIGS = "configs";

type RetrievedEntry<K extends PersistedKey = PersistedKey> = readonly [
  K,
  OrNullEntries<PersistedConfigs>[K]
];

function decodeValueFromKey(
  key: PersistedKey,
  value: string
): PersistedConfigs[typeof key] {
  switch (key) {
    case "actionThreshold":
      return Number(value) as PersistedConfigs["actionThreshold"];
    default:
      return value as any;
  }
}
export class RedisStorage implements Storage {
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

  private async mGet(keys: string[]): Promise<string[]> {
    try {
      const res = (await this.client.mGet(keys)) as string[];
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to mGet from database!");
    }
  }
  public async registerConfigs(
    guildId: string,
    configs: AtLeastOne<PersistedConfigs>
  ): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      const redisKey: string = `${REDIS_NAMESPACE_GUILDS}:${guildId}:${REDIS_NAMESPACE_CONFIGS}:${key}`;
      await this.set(redisKey, value.toString());
    }
  }

  public async retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>> {
    const keys = persistedConfigs.map(
      (configPrefix) =>
        `${REDIS_NAMESPACE_GUILDS}:${guildId}:${REDIS_NAMESPACE_CONFIGS}:${configPrefix}`
    );

    const retrieved = await this.mGet(keys);
    const entries: RetrievedEntry[] = retrieved.flatMap(
      (r, i): RetrievedEntry[] => {
        const key = persistedConfigs[i];
        if (!r) return [[key, null]];
        const value = decodeValueFromKey(key, r);
        return [[key, value]];
      }
    );

    const out = Object.fromEntries(entries);
    return out as OrNullEntries<PersistedConfigs>;
  }

  public async destroy(): Promise<void> {
    await this.client.close();
  }
}
