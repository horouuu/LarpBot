import { CommandContext, HandlerMap } from "@types-local/commands";
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
  handleBankPages,
  sellAllItems,
} from "./rs/_bank.js";
import { buildStakeSubcommand, startStake } from "./rs/_stake.js";
import { buildBalanceSubcommand, checkBalance } from "./rs/_balance.js";
import { buildTransferSubcommand, transferCoins } from "./rs/_transfer.js";
import { buildSellSubcommand, sellItems } from "./rs/_sell.js";
import { buildLbSubcommandGroup, showCoinLb } from "./rs/_lb.js";
import { buildKcSubcommand, getKc } from "./rs/_kc.js";
import { buildPcSubcommand, priceCheck } from "./rs/_pc.js";

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
  .addSubcommand(buildSellSubcommand)
  .addSubcommand(buildPcSubcommand);

const handlerMap: HandlerMap = {
  clue: {
    open: openClue,
    stats: showClueStats,
  },
  bank: {
    open: handleBankPages,
    sellall: sellAllItems,
  },
  lb: {
    coins: showCoinLb,
  },
  kill: killMonster,
  kc: getKc,
  stake: startStake,
  balance: checkBalance,
  transfer: transferCoins,
  sell: sellItems,
  pc: priceCheck,
};

const rs = {
  ...rsData.toJSON(),
  async execute(ctx: CommandContext) {
    const { interaction } = ctx;
    const cmd = interaction.options.getSubcommand();
    const cmdGroup = interaction.options.getSubcommandGroup();
    try {
      const handlerEntry = handlerMap[cmdGroup ?? cmd];
      if (cmdGroup && typeof handlerEntry === "function")
        throw new Error("Something went wrong.");

      const handler =
        typeof handlerEntry === "function"
          ? handlerEntry
          : cmdGroup && handlerEntry?.[cmd];

      if (!handler) throw new Error("Invalid command.");
      await handler(ctx);
    } catch (e) {
      console.error(e);
      catchAllInteractionReply(interaction, (e as Error).message);
    }
  },
};

export { rs };
