import { CommandContext } from "@types-local/commands";
import { SlashCommandBuilder } from "discord.js";
import { openClue, showClueStats } from "./rs/_clue.js";
import { catchAllInteractionReply } from "@utils";
import { killMonster } from "./rs/_kill.js";
import { getInventoryEmbeds, handleBankPages } from "./rs/_bank.js";
import { stake, startStake } from "./rs/_stake.js";
import { checkBalance } from "./rs/_balance.js";
import { transferCoins } from "./rs/_transfer.js";

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
      .addSubcommand((opt) =>
        opt.setName("stats").setDescription("View your clue stats.")
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
  )
  .addSubcommand((opt) => opt.setName("bank").setDescription("View your bank."))
  .addSubcommand((opt) =>
    opt
      .setName("stake")
      .setDescription("Simulates a stake between you and another player.")
      .addUserOption((opt) =>
        opt
          .setName("opponent")
          .setDescription("Person to challenge as your opponent.")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("stake")
          .setDescription("Amount of gold to stake")
          .setRequired(false)
      )
  )
  .addSubcommand((opt) =>
    opt.setName("balance").setDescription("Check your coin balance.")
  )
  .addSubcommand((opt) =>
    opt
      .setName("transfer")
      .setDescription("Transfer coins to another user.")
      .addUserOption((opt) =>
        opt
          .setName("recipient")
          .setDescription("User to transfer coins to.")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("amount")
          .setDescription("Amount of coins to transfer.")
          .setRequired(true)
      )
  );

const rs = {
  ...rsData.toJSON(),
  async execute(ctx: CommandContext) {
    const { interaction } = ctx;
    const cmd = interaction.options.getSubcommand();
    const cmdGroup = interaction.options.getSubcommandGroup();
    try {
      switch (cmd) {
        case "open":
          await openClue(ctx);
          break;
        case "kill":
          await killMonster(ctx);
          break;
        case "stats":
          if (cmdGroup === "clue") {
            await showClueStats(ctx);
          }
          break;
        case "bank":
          const out = await getInventoryEmbeds(ctx);
          if (out.embeds.length === 0)
            return await interaction.reply("You have no items!");

          const msg = await interaction.reply({
            embeds: [out.embeds[0]],
            components: [out.actionRow],
            withResponse: true,
          });

          await handleBankPages(ctx, msg, out);
          break;
        case "stake":
          await startStake(ctx);
          break;
        case "balance":
          await checkBalance(ctx);
          break;
        case "transfer":
          const p1 = interaction.user;
          const p2 = interaction.options.getUser("recipient");
          const amount = interaction.options.getString("amount");

          if (!p2)
            return await interaction.reply(
              "You must indicate a recipient to transfer coins to."
            );
          if (!amount)
            return await interaction.reply(
              "You must indicate an amount to transfer."
            );

          await transferCoins(ctx, p1, p2, amount);
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
