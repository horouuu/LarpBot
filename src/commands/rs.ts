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
    const rewards = res.tier.open(res.num).items();
    let total = 0;
    const spaces = Math.max(...rewards.map((i) => String(i[1]).length));
    console.log(rewards.map((i) => String(i[1]).length));
    const got = rewards
      .map((r) => {
        const item = r[0];
        const amt = r[1];

        total += item.price * amt;
        return `${amt}x [${item.name}](<${item.wiki_url}>) (${Util.toKMB(
          item.price * amt
        )})`;
      })
      .join("\n");

    await interaction.reply(
      `You opened a **[${
        res.name
      }]** clue scroll!\n${got}\n### Total loot: ${Util.toKMB(total)}`
    );
  },
};

export { rs };
