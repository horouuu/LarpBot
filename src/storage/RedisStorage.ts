import { createClient } from "redis";
import { ConfigType } from "@config";
import {
  persistedConfigs,
  PersistedConfigs,
  PersistedKey,
  Storage,
} from "@storage";
import { AtLeastOne, OrNullEntries } from "@types-local/util";

enum RedisNamespaces {
  GUILDS = "guilds",
  CONFIGS = "configs",
  COMMANDS = "commands",
}

enum RedisTypes {
  STRING = "string",
  SET = "set",
  NONE = "none",
}

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
      url: config.redisUrl,
    });

    client.on("err", (e) => console.error(e));
    await client.connect();

    return new RedisStorage(client);
  }

  private async sAdd(key: string, members: string | string[]): Promise<void> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.SET && type !== RedisTypes.NONE)
        throw new Error(
          `ERROR: sAdd tried to add set item to non-set store (${type}) at key ${key}`
        );

      await this.client.sAdd(key, members);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  public async sGet(key: string): Promise<string[]> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.SET)
        throw new Error(
          `ERROR: sGet tried to retrieve non-set item at key ${key}`
        );
      return await this.client.sMembers(key);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  private async sRem(key: string, members: string): Promise<number> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.SET)
        throw new Error(
          `ERROR: sRem Attempted to remove set item from key storing non-set value at key ${key}.`
        );

      return await this.client.sRem(key, members);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async set(key: string, value: string): Promise<void> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE)
        throw new Error(
          `ERROR: Attempted to set string value at key storing non-string value ${key}.`
        );
      await this.client.set(key, value);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async get(key: string): Promise<string | null> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE) {
        throw new Error(
          `ERROR: get tried to retrieve non-string value at key ${key}`
        );
      }
      const res = await this.client.get(key);
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  private async scan(options: {
    regex?: RegExp;
    match?: string;
  }): Promise<string[]> {
    try {
      const { regex, match } = options;
      let cursor = "0";
      const found: string[] = [];
      do {
        const res = await this.client.scan(cursor, {
          MATCH: match,
        });

        cursor = res.cursor;
        if (regex) {
          res.keys.forEach((k) => {
            if (regex.test(k)) found.push(k);
          });
        } else {
          found.push(...res.keys);
        }
      } while (cursor !== "0");

      return found;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database.");
    }
  }

  private async getDel(key: string): Promise<string | null> {
    try {
      const type = await this.client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE) {
        throw new Error(
          `ERROR: get tried to retrieve non-string value at key ${key}`
        );
      }
      const res = await this.client.getDel(key);
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  private async mGet(keys: string[]): Promise<string[]> {
    try {
      return (await this.client.mGet(keys)) as string[];
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }
  public async registerConfigs(
    guildId: string,
    configs: AtLeastOne<PersistedConfigs>
  ): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      const redisKey: string = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.CONFIGS}:${key}`;
      await this.set(redisKey, value.toString());
    }
  }

  public async retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>> {
    const keys = persistedConfigs.map(
      (configPrefix) =>
        `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.CONFIGS}:${configPrefix}`
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

  // abstract these 3 if more commands require registration/delisting
  public async chRegGatekeeper(
    guildId: string,
    channelId: string,
    force?: boolean
  ) {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.COMMANDS}:gatekeeper:channelsWatched`;

    const stored = await this.client.get(key);
    if (stored && !force) {
      return { success: false, watching: stored };
    } else {
      this.set(key, channelId);
      return { success: true as true };
    }
  }

  public async chGetGatekeeper(guildId: string): Promise<string | null> {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.COMMANDS}:gatekeeper:channelsWatched`;
    return await this.get(key);
  }

  public async chDelGatekeeper(guildId: string) {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.COMMANDS}:gatekeeper:channelsWatched`;
    const res = await this.getDel(key);
    if (!res) return { success: false as false };

    return { success: true, delisted: res };
  }

  public async getAllGatekept() {
    const match = "guilds:*:commands:gatekeeper:channelsWatched";
    const keys = await this.scan({ match: match });
    const vals = await this.mGet(keys);
    const pairs = keys.map((k, i) => ({
      guildId: k.split(":")[1],
      channelId: vals[i],
    }));
    return pairs;
  }

  public async destroy(): Promise<void> {
    await this.client.close();
  }
}
