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
  .addSubcommandGroup(buildLbSubcommandGroup)
  .addSubcommandGroup(buildBankSubcommandGroup)
  .addSubcommand(buildKillSubcommand)
  .addSubcommand(buildKcSubcommand)
  .addSubcommand(buildStakeSubcommand)
  .addSubcommand(buildBalanceSubcommand)
  .addSubcommand(buildTransferSubcommand)
  .addSubcommand(buildSellSubcommand);

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
            await handleBankPages(ctx);
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
          await transferCoins(ctx);
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
