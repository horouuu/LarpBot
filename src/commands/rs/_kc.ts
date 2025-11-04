import { CommandContext } from "@types-local/commands";
import { NewMonsters } from "./monsters/index.js";
import { Monster } from "oldschooljs";
import { SlashCommandSubcommandBuilder } from "discord.js";

export const buildKcSubcommand = (opt: SlashCommandSubcommandBuilder) =>
  opt
    .setName("kc")
    .setDescription("Get kill count of a monster.")
    .addStringOption((opt) =>
      opt
        .setName("monster")
        .setDescription("Name of the monster to get kill count of")
        .setRequired(true)
    );

export async function getKc(ctx: CommandContext) {
  const { interaction, storage } = ctx;
  const monster = interaction.options.getString("monster") ?? "_____";
  const found: Monster | null = NewMonsters.find((m) =>
    m.aliases.join(" ").includes(monster.toLowerCase())
  );

  if (!found) {
    await interaction.reply({
      content: `Monster or alias \`${monster}\` not found.`,
    });
    return;
  }

  const kc = await storage.getKc(interaction.user.id, found.id);

  await interaction.reply({
    content: `You have a **${found.name}** killcount of **${kc}**.`,
  });
}
