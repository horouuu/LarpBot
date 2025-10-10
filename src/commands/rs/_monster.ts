import { CommandContext } from "@types-local/commands";
import { Monsters, Util } from "oldschooljs";
import { parseLoot } from "./_rs_utils";

export async function monsterKill(ctx: CommandContext) {
  const { interaction } = ctx;
  const monster = interaction.options.getString("monster") ?? "_____";
  const found = Monsters.find((m) => m.aliases.includes(monster.toLowerCase()));
  if (!found) {
    interaction.reply({
      content: `Monster or alias \`${monster}\` not found.`,
    });
    return;
  }

  const rewards = found.kill(1, {}).items();
  const { got, total } = parseLoot(rewards);
  const msg = `You killed [${found.name}](${found.data.wikiURL})!\n${got}\n### Total loot: ${total}`;

  await interaction.reply(msg);
}
