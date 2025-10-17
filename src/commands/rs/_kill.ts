import { CommandContext } from "@types-local/commands";
import { Monster, Monsters } from "oldschooljs";
import { parseLoot } from "./_rs_utils.js";
import { CustomMonsters } from "./monsters/index.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionCallback,
  User,
} from "discord.js";

const NativeMonsters = [...Monsters].map((m) => m[1]);
const NewMonsters = [...NativeMonsters, ...CustomMonsters];

type MonsterMetaData = {
  [monsterId: number]: {
    teamBoss: boolean;
    partySizes: number[];
    cooldowns: number[];
  };
};

const metadata: MonsterMetaData = {
  13447: {
    teamBoss: true,
    partySizes: [1, 2, 3, 4, 5],
    cooldowns: [7200, 1800, 1200, 900, 600],
  },
};

async function killTeamMonster(ctx: CommandContext, monster: Monster) {
  const { interaction, storage } = ctx;
  const { partySizes, cooldowns } = metadata[monster.id];
  const cdList = partySizes
    .map((e, i) => `${e}: ${cooldowns[i] / 60} minutes`)
    .join("\n");

  const partyMems: User[] = [];
  const msg = await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("Aqua")
        .setTitle(`${monster.name}: ${interaction.user.displayName}'s party`)
        .setDescription(
          `You have opted to kill a team boss.\nThis boss can be killed in parties of: ${partySizes}.\n\nThe following are the cooldowns incurred by each party size:\n${cdList}\n\n**Members**\n- ${interaction.user} (leader)`
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("join")
          .setLabel("Join")
          .setStyle(ButtonStyle.Success),
        ...partyMems.map((p) =>
          new ButtonBuilder()
            .setCustomId(p.id)
            .setLabel(`Remove ${p}`)
            .setStyle(ButtonStyle.Danger)
        )
      ),
    ],
  });
}

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

  if (found.id in metadata) {
    const { teamBoss, cooldowns } = metadata[found.id];
    if (teamBoss) {
      await killTeamMonster(ctx, found);
    } else if (cooldowns.length > 0) {
      // set cooldown to cooldowns[0]
    }
  } else {
    const rewards = found.kill(1, {}).items();
    const { got, total } = parseLoot(rewards);
    const msg = `You killed [${found.name}](<${found.data.wikiURL}>)!\n${got}\n### Total loot: ${total}`;

    await interaction.reply(msg);
  }
}
