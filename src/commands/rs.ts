import { CommandContext } from "@types-local/commands";
import { SlashCommandBuilder } from "discord.js";
import { Clues, Util } from "oldschooljs";

const clueList = [
  { tier: Clues.Medium, num: 1, name: "Medium" },
  { tier: Clues.Hard, num: 1, name: "Hard" },
  { tier: Clues.Elite, num: 1, name: "Elite" },
  { tier: Clues.Master, num: 1, name: "Master" },
];

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
  );

const rs = {
  ...rsData.toJSON(),
  async execute(ctx: CommandContext) {
    const { interaction } = ctx;
    const roll = Math.round(Math.random() * 3);
    const res = clueList[roll];
    const rewards = res.tier.open(res.num).items()[0];

    await interaction.reply(
      `You opened a **[${res.name}]** clue scroll!\nGot: [${
        rewards[0].name
      }](<${rewards[0].wiki_url}>) (${Util.toKMB(rewards[0].price)})`
    );
  },
};

export { rs };
