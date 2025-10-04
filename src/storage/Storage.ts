import { AtLeastOne, OrNullEntries } from "@types-local/util";
import { ConfigType } from "@config";

const persistedConfigs = ["actionThreshold"] as const;
type PersistedKey = (typeof persistedConfigs)[number];
type PersistedConfigs = Pick<ConfigType, PersistedKey>;
type ChRegReturn = { success: true } | { success: false; watching: string };
type ChDelReturn = { success: true; delisted: string } | { success: false };
type RetrievedGatekept = {
  guildId: string;
  channelId: string;
};
export abstract class Storage {
  abstract registerConfigs(
    guildId: string,
    configs: AtLeastOne<PersistedConfigs>
  ): Promise<void>;

  abstract retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>>;

  abstract chRegGatekeeper(
    guildId: string,
    channelId: string,
    force?: boolean
  ): Promise<ChRegReturn>;

  abstract chGetGatekeeper(guildId: string): Promise<string | null>;

  abstract chDelGatekeeper(guildId: string): Promise<ChDelReturn>;

  abstract getAllGatekept(): Promise<RetrievedGatekept[]>;
}

export type { PersistedKey, PersistedConfigs };
export { persistedConfigs };
