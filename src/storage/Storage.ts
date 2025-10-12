import { OrNullEntries } from "@types-local/util";
import { DBClueData } from "@commands/rs/_rs_utils";

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
export abstract class Storage {
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

  abstract updateClueData(userId: string, data: DBClueData<number>): Promise<void>;

  abstract getClueData(userId: string): Promise<DBClueData<string>>;

  abstract updateCoins(userId: string, change: number): Promise<void>;
}

export type { PersistedKey, PersistedConfigs };
export { persistedConfigs };
