import { CommandContext } from "@types-local/commands";
import { SlashCommandBuilder } from "discord.js";
import {
  buildClueSubCommandGroup as buildClueSubcommandGroup,
  openClue,
  showClueStats,
} from "./rs/_clue.js";
import { catchAllInteractionReply } from "@utils";
import { buildKillSubcommand, killMonster } from "./rs/_kill.js";
import {
  buildBankSubcommandGroup,
  getInventoryEmbeds,
  handleBankPages,
  sellAllItems,
} from "./rs/_bank.js";
import { buildStakeSubcommand, startStake } from "./rs/_stake.js";
import { buildBalanceSubcommand, checkBalance } from "./rs/_balance.js";
import { buildTransferSubcommand, transferCoins } from "./rs/_transfer.js";
import { buildSellSubcommand, sellItems } from "./rs/_sell.js";
import { buildLbSubcommandGroup, showCoinLb } from "./rs/_lb.js";
import { buildKcSubcommand, getKc } from "./rs/_kc.js";

const rsData = new SlashCommandBuilder()
  .setName("rs")
  .setDescription("Run a command related to OSRS.")
  .addSubcommandGroup(buildClueSubcommandGroup)
  .addSubcommand(buildKillSubcommand)
  .addSubcommand(buildKcSubcommand)
  .addSubcommandGroup(buildBankSubcommandGroup)
  .addSubcommand(buildStakeSubcommand)
  .addSubcommand(buildBalanceSubcommand)
  .addSubcommand(buildTransferSubcommand)
  .addSubcommand(buildSellSubcommand)
  .addSubcommandGroup(buildLbSubcommandGroup);

const rs = {
  ...rsData.toJSON(),
  async execute(ctx: CommandContext) {
    const { interaction } = ctx;
    const cmd = interaction.options.getSubcommand();
    const cmdGroup = interaction.options.getSubcommandGroup();
    try {
      switch (cmd) {
        case "open":
          if (cmdGroup === "clue") {
            await openClue(ctx);
          } else if (cmdGroup === "bank") {
            const out = await getInventoryEmbeds(ctx);
            if (out.embeds.length === 0)
              return await interaction.reply("You have no items!");

            const msg = await interaction.reply({
              embeds: [out.embeds[0]],
              components: [out.actionRow],
              withResponse: true,
            });

            await handleBankPages(ctx, msg, out);
          }
          break;
        case "kill":
          await killMonster(ctx);
          break;
        case "kc":
          await getKc(ctx);
          break;
        case "stats":
          if (cmdGroup === "clue") {
            await showClueStats(ctx);
          }
          break;
        case "sellall":
          await sellAllItems(ctx);
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
        case "sell":
          await sellItems(ctx);
          break;
        case "coins":
          if (cmdGroup === "lb") {
            await showCoinLb(ctx);
          }
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
