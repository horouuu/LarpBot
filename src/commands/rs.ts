import { CommandContext } from "@types-local/commands";
import { SlashCommandBuilder } from "discord.js";
import { openClue } from "./rs/_clue";
import { catchAllInteractionReply } from "@utils";
import { killMonster } from "./rs/_kill";

const rsData = new SlashCommandBuilder()
  .setName("rs")
  .setDescription("Run a command related to OSRS.")
  .addSubcommandGroup((opt) =>
    opt
      .setName("clue")
      .setDescription("Run clue-related commands.")
      .addSubcommand((opt) =>
        opt.setName("open").setDescription("Open a random clue casket!")
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName("kill")
      .setDescription("Simulate killing a monster.")
      .addStringOption((opt) =>
        opt
          .setName("monster")
          .setDescription("Name of the monster to simulate killing.")
          .setRequired(true)
      )
  );

const rs = {
  ...rsData.toJSON(),
  async execute(ctx: CommandContext) {
    const { interaction } = ctx;
    const cmd = interaction.options.getSubcommand();

    try {
      switch (cmd) {
        case "open":
          await openClue(ctx);
          break;
        case "kill":
          await killMonster(ctx);
          break;
        default:
          throw new Error("Invalid input.");
      }
    } catch (e) {
      console.error(e);
      catchAllInteractionReply(interaction, (e as Error).message);
    }
  },
};

export { rs };
