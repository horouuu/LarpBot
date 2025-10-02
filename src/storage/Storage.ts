import { AtLeastOne, OrNullEntries } from "@/types/util";
import { ConfigType } from "@config";

const persistedConfigs = ["actionThreshold"] as const;
type PersistedKey = (typeof persistedConfigs)[number];
type PersistedConfigs = Pick<ConfigType, PersistedKey>;
export abstract class Storage {
  abstract registerConfigs(
    guildId: string,
    configs: AtLeastOne<PersistedConfigs>
  ): Promise<void>;

  abstract retrieveConfigs(
    guildId: string
  ): Promise<OrNullEntries<PersistedConfigs>>;
}

export type { PersistedKey, PersistedConfigs };
export { persistedConfigs };
