import { CommandContext } from "@types-local/commands";
import {
  ComponentType,
  InteractionCallback,
  InteractionCallbackResponse,
  SlashCommandBuilder,
} from "discord.js";
import { openClue, showClueStats } from "./rs/_clue.js";
import { catchAllInteractionReply } from "@utils";
import { killMonster } from "./rs/_kill.js";
import { getInventoryEmbed as getInventoryEmbeds } from "./rs/_bank.js";

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
  .addSubcommand((opt) =>
    opt.setName("bank").setDescription("View your bank.")
  );

async function handleBankPages(
  ctx: CommandContext,
  msg: InteractionCallbackResponse<boolean>,
  components: Awaited<ReturnType<typeof getInventoryEmbeds>>
) {
  const { interaction } = ctx;
  const collector = msg.resource?.message?.createMessageComponentCollector({
    filter: (i) =>
      (i.customId === "bank_back" || i.customId === "bank_next") &&
      i.user.id == interaction.user.id,
    time: 15000,
    componentType: ComponentType.Button,
  });

  let page = 0;
  collector?.on("collect", async (i) => {
    const deferTimer = setTimeout(() => i.deferUpdate().catch(), 2500);
    switch (i.customId) {
      case "bank_next":
        if (page + 1 === components.embeds.length) return;
        page += 1;
        break;
      case "bank_back":
        if (page - 1 < 0) return;
        page -= 1;
        break;
      default:
        return;
    }

    const isFirst = page === 0;
    const isLast = page === components.embeds.length - 1;

    components.actionRow.components[0].setDisabled(isFirst);
    components.actionRow.components[1].setDisabled(isLast);

    const content = {
      embeds: [components.embeds[page]],
      components: [components.actionRow],
    };
    if (i.deferred) {
      await i.editReply(content);
    } else {
      await i.update(content);
    }

    deferTimer.close();
    collector.resetTimer();
  });
}

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
          const msg = await interaction.reply({
            embeds: [out.embeds[0]],
            components: [out.actionRow],
            withResponse: true,
          });

          await handleBankPages(ctx, msg, out);
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
