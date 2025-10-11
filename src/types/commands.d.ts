import { Storage } from "@storage";
import { ConfigType } from "@config";
import {
  CacheType,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export type CommandContext = {
  interaction: ChatInputCommandInteraction<CacheType>;
  config: ConfigType;
  storage: Storage;
};

export type CommandContextRequire<
  Ctx extends CommandContext,
  Keys extends keyof Ctx = never
> = Omit<Ctx, Keys> & Required<Pick<Ctx, Keys>>;

export interface Command
  extends RESTPostAPIChatInputApplicationCommandsJSONBody {
  execute(commandCtx: CommandContextRequire<CommandContext>): Promise<void>;
  execute(commandCtx: CommandContext): Promise<void>;
}
