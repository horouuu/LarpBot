import { createClient } from "redis";
import { ConfigType } from "@config";
import {
  persistedConfigs,
  PersistedConfigs,
  PersistedKey,
  Storage,
} from "@storage";
import { OrNullEntries } from "@types-local/util";
import {
  DBClueData,
  getEmptyClueData,
  getClueKey as getRsClueKey,
  getCoinsKey as getRsCoinsKey,
} from "@commands/rs/_rs_utils.js";
import { Item } from "oldschooljs";

enum RedisNamespaces {
  GUILDS = "guilds",
  CONFIGS = "configs",
  COMMANDS = "commands",
}

enum RedisTypes {
  STRING = "string",
  SET = "set",
  HASH = "hash",
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
  private _client: ReturnType<typeof createClient>;

  private constructor(client: typeof this._client) {
    this._client = client;
  }

  public static async create(config: ConfigType) {
    const client = createClient({
      url: config.redisUrl,
    });

    client.on("err", (e) => console.error(e));
    await client.connect();

    return new RedisStorage(client);
  }

  private async _checkType(key: string, type: RedisTypes, notNull = true) {
    const t = await this._client.type(key);
    if (t !== type && (t !== RedisTypes.NONE || !notNull)) return true;
    return false;
  }

  private async _sAdd(key: string, members: string | string[]): Promise<void> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.SET && type !== RedisTypes.NONE)
        throw new Error(
          `ERROR: sAdd tried to add set item to non-set store (${type}) at key ${key}`
        );

      await this._client.sAdd(key, members);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  public async _sGet(key: string): Promise<string[]> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.SET)
        throw new Error(
          `ERROR: sGet tried to retrieve non-set item at key ${key}`
        );
      return await this._client.sMembers(key);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  private async _sRem(key: string, members: string): Promise<number> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.SET)
        throw new Error(
          `ERROR: sRem Attempted to remove set item from key storing non-set value at key ${key}.`
        );

      return await this._client.sRem(key, members);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async hSet(
    key: string,
    obj: { [str: string | number]: string | number }
  ) {
    try {
      if (!this._checkType(key, RedisTypes.HASH)) {
        throw new Error(
          `ERROR: Attempted to set hash value at key storing non-hash value ${key}.`
        );
      }
      await this._client.hSet(key, obj);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async _hGetAll(key: string) {
    try {
      if (!this._checkType(key, RedisTypes.HASH)) {
        throw new Error(
          `ERROR: Attempted to get hash value at key storing non-hash value ${key}.`
        );
      }
      return await this._client.hGetAll(key);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async _hIncrByFields(key: string, obj: Object) {
    try {
      const batch = this._client.multi();
      for (const [k, v] of Object.entries(obj)) {
        batch.hIncrBy(key, k, v);
      }

      await batch.execAsPipeline();
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async _hIncrByFieldsBucket(
    baseKey: string,
    bucketSize: number,
    obj: { [id: number]: any }
  ) {
    try {
      const batch = this._client.multi();
      for (const [k, v] of Object.entries(obj)) {
        const key = `${baseKey}:${Math.floor(parseInt(k) / bucketSize)}`;
        batch.hIncrBy(key, k, v);
      }

      await batch.execAsPipeline();
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  public async set(key: string, value: string): Promise<void> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE)
        throw new Error(
          `ERROR: Attempted to set string value at key storing non-string value ${key}.`
        );
      await this._client.set(key, value);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE) {
        throw new Error(
          `ERROR: get tried to retrieve non-string value at key ${key}`
        );
      }
      const res = await this._client.get(key);
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  public async incrBy(key: string, incr: number) {
    try {
      await this._client.incrBy(key, incr);
    } catch (e) {
      console.error(e);
      throw new Error("Failed to write to database!");
    }
  }

  private async _scan(options: {
    regex?: RegExp;
    match?: string;
  }): Promise<string[]> {
    try {
      const { regex, match } = options;
      let cursor = "0";
      const found: string[] = [];
      do {
        const res = await this._client.scan(cursor, {
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

  private async _getDel(key: string): Promise<string | null> {
    try {
      const type = await this._client.type(key);
      if (type !== RedisTypes.STRING && type !== RedisTypes.NONE) {
        throw new Error(
          `ERROR: get tried to retrieve non-string value at key ${key}`
        );
      }
      const res = await this._client.getDel(key);
      return res;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  private async _mGet(keys: string[]): Promise<string[]> {
    try {
      return (await this._client.mGet(keys)) as string[];
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }
  public async registerConfig<T extends PersistedKey>(
    guildId: string,
    config: {
      [K in T]: PersistedConfigs[T];
    }
  ): Promise<void> {
    for (const key of Object.keys(config) as T[]) {
      const value = config[key];
      const redisKey: string = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.CONFIGS}:${key}`;
      await this.set(redisKey, value.toString());
    }
  }

  public async checkIfEmpty(key: string): Promise<boolean> {
    try {
      const type = await this._client.type(key);
      return type === RedisTypes.NONE;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch from database!");
    }
  }

  public async retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>> {
    const keys = persistedConfigs.map(
      (configPrefix) =>
        `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.CONFIGS}:${configPrefix}`
    );

    const retrieved = await this._mGet(keys);
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
    force = false
  ) {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:${RedisNamespaces.COMMANDS}:gatekeeper:channelsWatched`;

    const stored = await this._client.get(key);
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
    const res = await this._getDel(key);
    if (!res) return { success: false as false };

    return { success: true, delisted: res };
  }

  public async getAllGatekept() {
    const match = "guilds:*:commands:gatekeeper:channelsWatched";
    const keys = await this._scan({ match: match });
    if (keys.length == 0) return [];
    const vals = await this._mGet(keys);
    const pairs = keys.map((k, i) => ({
      guildId: k.split(":")[1],
      channelId: vals[i],
    }));
    return pairs;
  }

  public async checkGuildMemberRole(guildId: string) {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:configs:memberRole`;
    const memberId = await this.get(key);
    return memberId;
  }

  public async setGuildMemberRole(
    guildId: string,
    roleId: string,
    force = false
  ) {
    const key = `${RedisNamespaces.GUILDS}:${guildId}:memberRole`;
    const current = await this.get(key);
    if (current && !force) {
      return { success: false, current: current };
    } else {
      await this.set(key, roleId);
      return { success: true as true };
    }
  }

  public async setMotd(guildId: string, msg: string) {
    const key = `guilds:${guildId}:commands:motd:message`;
    const replaced = await this.get(key);
    await this.set(key, msg);

    return replaced;
  }

  public async getMotd(guildId: string) {
    const key = `guilds:${guildId}:commands:motd:message`;
    const motd = await this.get(key);

    return motd;
  }

  public async clearMotd(guildId: string) {
    const key = `guilds:${guildId}:commands:motd:message`;
    await this._getDel(key);
  }

  public async updateClueData(userId: string, data: DBClueData<number>) {
    const clueKey = getRsClueKey(userId);
    await this._hIncrByFields(clueKey, data);
    await this.updateCoins(userId, data.clueCoins);
  }

  public async getClueData(userId: string) {
    const clueKey = getRsClueKey(userId);
    const type = await this._client.type(clueKey);
    if (type === RedisTypes.NONE) {
      const clueData = getEmptyClueData();
      await this.updateClueData(userId, clueData);
      return getEmptyClueData<string>(true);
    }
    return (await this._hGetAll(clueKey)) as unknown as DBClueData<string>;
  }

  public async updateCoins(userId: string, change: number) {
    const coinsKey = getRsCoinsKey(userId);
    await this.incrBy(coinsKey, change);
  }

  public async updateInventory(userId: string, items: [Item, number][]) {
    const baseKey = `users:${userId}:rs:inv`;
    const itemsMap: { [id: number]: number } = {};
    items.forEach((t) => (itemsMap[t[0].id] = t[1]));
    await this._hIncrByFieldsBucket(baseKey, 1000, itemsMap);
  }

  public async destroy(): Promise<void> {
    await this._client.close();
  }
}
