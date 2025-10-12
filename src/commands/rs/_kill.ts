import { CommandContext } from "@types-local/commands";
import { Monsters } from "oldschooljs";
import { parseLoot } from "./_rs_utils.js";
import { CustomMonsters } from "./monsters/index.js";

const NativeMonsters = [...Monsters].map((m) => m[1]);
const NewMonsters = [...NativeMonsters, ...CustomMonsters];

export async function killMonster(ctx: CommandContext) {
  const { interaction } = ctx;
  const monster = interaction.options.getString("monster") ?? "_____";
  const found = NewMonsters.find((m) =>
    m.aliases.join(" ").includes(monster.toLowerCase())
  );

  if (!found) {
    interaction.reply({
      content: `Monster or alias \`${monster}\` not found.`,
    });
    return;
  }

  const rewards = found.kill(1, {}).items();
  const { got, total } = parseLoot(rewards);
  const msg = `You killed [${found.name}](<${found.data.wikiURL}>)!\n${got}\n### Total loot: ${total}`;

  await interaction.reply(msg);
}
