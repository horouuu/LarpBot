import { OrNullEntries } from "@types-local/util";
import { DB1hPricesData, DBClueData } from "@commands/rs/_rs-utils";
import { Item } from "oldschooljs";

const persistedConfigs = ["actionThreshold", "memberRole"] as const;
type PersistedKey = (typeof persistedConfigs)[number];
type PersistedConfigs = {
  actionThreshold: number;
  memberRole: string;
};
type FailureWithReturn<T extends string> =
  | { success: true }
  | ({ success: false } & { [K in T]: string });
type ChDelReturn = { success: true; delisted: string } | { success: false };
type RetrievedGatekept = {
  guildId: string;
  channelId: string;
};

export type RsCdStores = "clues";

export abstract class Storage {
  abstract getInMemory(key: string): string | null;
  abstract setInMemory(key: string, value: string): void;
  abstract delInMemory(key: string): void;

  abstract registerConfig<T extends PersistedKey>(
    guildId: string,
    config: {
      [K in T]: PersistedConfigs[T];
    }
  ): Promise<void>;

  abstract retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>>;

  abstract chRegGatekeeper(
    guildId: string,
    channelId: string,
    force?: boolean
  ): Promise<FailureWithReturn<"watching">>;

  abstract chGetGatekeeper(guildId: string): Promise<string | null>;

  abstract chDelGatekeeper(guildId: string): Promise<ChDelReturn>;

  abstract getAllGatekept(): Promise<RetrievedGatekept[]>;

  abstract checkGuildMemberRole(guildId: string): Promise<string | null>;

  abstract setGuildMemberRole(
    guildId: string,
    roleId: string
  ): Promise<FailureWithReturn<"current">>;

  abstract setMotd(guildId: string, msg: string): Promise<string | null>;

  abstract getMotd(guildId: string): Promise<string | null>;

  abstract clearMotd(guildId: string): Promise<void>;

  abstract updateClueData(
    userId: string,
    data: DBClueData<number>
  ): Promise<void>;

  abstract getClueData(userId: string): Promise<DBClueData<string>>;

  abstract getCoins(userId: string): Promise<number>;

  abstract updateCoins(userId: string, change: number): Promise<void>;

  abstract getInventory(userId: string): Promise<{ [id: string]: string }>;

  abstract updateKcs(userId: string, kcs: [number, number][]): Promise<void>;

  abstract getKc(userId: string, monsterId: number): Promise<number>;

  abstract setKillCd(
    userId: string,
    monsterId: number,
    cdSecs: number
  ): Promise<void>;

  abstract checkKillCd(userId: string, monsterId: number): Promise<number>;

  abstract setCdByKey(
    userId: string,
    cdKey: RsCdStores,
    cdSecs: number
  ): Promise<void>;

  abstract checkCdByKey(userId: string, cdKey: RsCdStores): Promise<number>;

  abstract updateInventory(
    userId: string,
    items: [Item, number][]
  ): Promise<void>;

  abstract getCoinsData(users: string[]): Promise<[string, number][]>;

  abstract update1hPrices(data: DB1hPricesData): Promise<void>;

  abstract check1hPrice(itemId: number): Promise<{
    data: DB1hPricesData["data"][number];
    timestamp: DB1hPricesData["timestamp"];
  } | null>;
}

export type { PersistedKey, PersistedConfigs };
export { persistedConfigs };
