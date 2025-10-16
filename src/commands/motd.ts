import {
  Command,
  CommandContext,
  CommandContextRequire,
} from "@types-local/commands";
import { catchAllInteractionReply } from "@utils";
import { SlashCommandBuilder } from "discord.js";

enum MotdEnum {
  MOTD_NAME = "motd",
  MOTD_MSG = "message",
  MOTD_SET = "set",
  MOTD_VIEW = "view",
  MOTD_CLEAR = "clear",
}

type MotdContext = CommandContextRequire<CommandContext, "config" | "storage">;

const motdData = new SlashCommandBuilder()
  .setName(MotdEnum.MOTD_NAME)
  .setDescription("Configures gatekeeper for this server.")
  .addSubcommand((opt) =>
    opt
      .setName(MotdEnum.MOTD_SET)
      .setDescription("Set the message of the day.")
      .addStringOption((opt) =>
        opt
          .setName(MotdEnum.MOTD_MSG)
          .setDescription("Message to set as message of the day.")
          .setRequired(true)
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName(MotdEnum.MOTD_VIEW)
      .setDescription("View the message of the day.")
  )
  .addSubcommand((opt) =>
    opt
      .setName(MotdEnum.MOTD_CLEAR)
      .setDescription("Clear the message of the day.")
  );

async function handleSet(ctx: MotdContext & { guildId: string }) {
  const { interaction, storage, guildId } = ctx;
  const msg = interaction.options.getString(MotdEnum.MOTD_MSG);

  if (msg == null) throw new Error("Error retrieving input message");
  const replaced = await storage.setMotd(guildId, msg);
  let setMsg = `Successfully set message of the day to: \`${msg}\``;
  if (replaced !== null) {
    setMsg += `\nReplaced: \`${replaced}\``;
  }
  await interaction.reply(setMsg);
}

async function handleView(ctx: MotdContext & { guildId: string }) {
  const { interaction, storage, guildId } = ctx;
  const motd = await storage.getMotd(guildId);
  let msg = `There is currently no message of the day.`;
  if (motd !== null) {
    msg = motd;
  }

  await interaction.reply(msg);
}

async function execute(ctx: MotdContext) {
  const { interaction, storage } = ctx;
  if (!interaction.isChatInputCommand()) return;
  const guildId = interaction.guild?.id;
  if (!guildId) throw new Error("Error retrieving guild id");
  const sc = interaction.options.getSubcommand();
  try {
    switch (sc) {
      case MotdEnum.MOTD_SET:
        await handleSet({ ...ctx, guildId });
        break;
      case MotdEnum.MOTD_VIEW:
        await handleView({ ...ctx, guildId });
        break;
      case MotdEnum.MOTD_CLEAR:
        await storage.clearMotd(guildId);
        await interaction.reply("Successfully cleared the message of the day.");
        break;
      default:
        throw new Error("Unknown subcommand selected.");
    }
  } catch (e) {
    catchAllInteractionReply(interaction, (e as Error).message);
  }
}

const motd = { ...motdData.toJSON(), execute } satisfies Command;

export { motd };
