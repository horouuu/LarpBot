import { CommandContext } from "@types-local/commands";
import { NewMonsters } from "./monsters/index.js";
import { Monster } from "oldschooljs";

export async function getKc(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const monster = interaction.options.getString("monster") ?? "_____";
  const found: Monster | null = NewMonsters.find((m) =>
    m.aliases.join(" ").includes(monster.toLowerCase())
  );

  if (!found) {
    return await interaction.reply({
      content: `Monster or alias \`${monster}\` not found.`,
    });
  }

  const kc = await storage.getKc(interaction.user.id, found.id);

  await interaction.reply({
    content: `You have a **${found.name}** killcount of **${kc}**.`
  });
}
