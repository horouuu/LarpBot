import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { catchAllInteractionReply } from "@utils";
import { ChannelType, DiscordAPIError, SlashCommandBuilder } from "discord.js";

enum GatekeeperEnum {
  GK_CMD_NAME = "gatekeeper",
  REGISTER = "register",
  DELIST = "delist",
  CHANNEL = "channel",
}

type GatekeeperContext = CommandContextRequire<CommandContext, "storage">;

const gatekeeperData = new SlashCommandBuilder()
  .setName(GatekeeperEnum.GK_CMD_NAME)
  .setDescription("Configures gatekeeper for this server.")
  .addSubcommand((opt) =>
    opt
      .setName(GatekeeperEnum.REGISTER)
      .setDescription(
        "Registers this channel to gatekeeper. Optionally, a channel can be specified."
      )
      .addChannelOption((opt) =>
        opt
          .setName(GatekeeperEnum.CHANNEL)
          .setDescription("Specifies channel to be watched by gatekeeper.")
          .setRequired(false)
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName(GatekeeperEnum.DELIST)
      .setDescription(
        "Delists this channel from gatekeeper. Optionally, a channel can be specified."
      )
      .addChannelOption((opt) =>
        opt
          .setName(GatekeeperEnum.CHANNEL)
          .setDescription("Specifies channel to be delisted from gatekeeper.")
          .setRequired(false)
      )
  );

async function register(ctx: GatekeeperContext) {
  const { interaction, storage } = ctx;
  try {
    const currentChannel = interaction.channel;
    let channel = interaction.options.getChannel<ChannelType.GuildText>(
      GatekeeperEnum.CHANNEL
    );
    if (!channel) {
      if (!currentChannel) {
        await interaction.reply(
          "I couldn't detect a valid channel and none were received through input!"
        );
        throw new Error("Gatekeeper: No valid channels detected");
      } else if (currentChannel.type !== ChannelType.GuildText) {
        await interaction.reply(
          "Gatekeeper only works in server-based text channels!"
        );
        throw new Error("Gatekeeper: Invalid channel");
      }

      channel = currentChannel;
    }

    const channelId = channel.id;
  } catch (e) {
    if (e instanceof DiscordAPIError) throw e;
    console.error(e);
  }
}

async function execute(commandCtx: GatekeeperContext): Promise<void> {
  const { interaction, storage } = commandCtx;
  if (!interaction.isChatInputCommand()) return;
  const sc = interaction.options.getSubcommand();

  try {
    switch (sc) {
      case GatekeeperEnum.REGISTER:
        break;
      case GatekeeperEnum.DELIST:
        break;
    }
  } catch (e) {
    catchAllInteractionReply(interaction);
  }
}

const gatekeeper = {
  ...gatekeeperData.toJSON(),
  execute,
} satisfies Command;

export { gatekeeper };
