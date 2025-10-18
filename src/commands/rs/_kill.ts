import { CommandContext } from "@types-local/commands";
import { Monster, Monsters } from "oldschooljs";
import { parseLoot } from "./_rs_utils.js";
import { CustomMonsters } from "./monsters/index.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
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

// partySizes and cooldowns must have the same length
const metadata: MonsterMetaData = {
  13447: {
    teamBoss: true,
    partySizes: [1, 2, 3, 4, 5],
    cooldowns: [7200, 1800, 1200, 900, 600],
  },
};

function renderActiveParty(
  partyLead: User,
  partyMems: User[],
  monster: Monster
) {
  const { partySizes, cooldowns } = metadata[monster.id];
  const cdList = partySizes
    .map((e, i) => `${e}: ${cooldowns[i] / 60} minutes`)
    .join("\n");

  const newMems = partyMems.map((pm) => `- ${pm}`);
  return {
    embeds: [
      new EmbedBuilder()
        .setColor("Aqua")
        .setTitle(`${monster.name}: ${partyLead.displayName}'s party`)
        .setDescription(
          `You have opted to kill a team boss.\nThis boss can be killed in parties of: ${partySizes}.\n\nThe following are the cooldowns incurred by each party size:\n${cdList}\n\n**Members**\n- ${partyLead} (leader)${
            newMems.length > 0 ? `\n${newMems}` : ""
          }`
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
            .setLabel(`Remove ${p.displayName}`)
            .setStyle(ButtonStyle.Danger)
        ),
        new ButtonBuilder()
          .setCustomId("disband")
          .setLabel("Disband")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("start")
          .setLabel("Start")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  };
}

async function killTeamMonster(ctx: CommandContext, monster: Monster) {
  const { interaction, storage } = ctx;
  const { partySizes, cooldowns } = metadata[monster.id];
  const partyMems: User[] = [];
  const msg = await interaction.reply(
    renderActiveParty(interaction.user, partyMems, monster)
  );

  const collector = msg.createMessageComponentCollector({
    filter: (i) => !i.user.bot,
    time: 60000,
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "join") {
      if (i.user.id === interaction.user.id || partyMems.includes(i.user)) {
        return await i.reply({
          content: "You are already in this party.",
          flags: [MessageFlags.Ephemeral],
        });
      } else {
        partyMems.push(i.user);
        return await i.update(
          renderActiveParty(interaction.user, partyMems, monster)
        );
      }
    } else if (i.customId === "disband") {
      if (i.user.id !== interaction.user.id)
        return await i.reply({
          content: "Only the party leader may disband the party.",
          flags: [MessageFlags.Ephemeral],
        });

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("DarkRed")
            .setTitle(
              `${monster.name}: ${interaction.user.displayName}'s party`
            )
            .setDescription("Party disbanded."),
        ],
        components: [],
      });
      return collector.stop();
    } else if (i.customId === "start") {
      const rewards = monster.kill(1, {}).items();
      const { got, total, totalRaw } = parseLoot(rewards);
      const memIds = partyMems.map((pm) => pm.id);
      const memList = partyMems.map((pm) => `- ${pm}`).join("\n");
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle(`Nex: ${interaction.user.displayName}'s party (success)`)
            .setDescription(
              `Success! You killed Nex for:\n${got}\n\n${
                partyMems.length > 0
                  ? `Rewards have been sold and split equally amongst party members:\n${memList}`
                  : `You killed ${monster.name} alone, so you reaped all the rewards!`
              }`
            ),
        ],
        components: [],
      });
    } else {
      if (i.user.id !== interaction.user.id) {
        return await i.reply({
          content: "Only the party leader can remove members from a party.",
          flags: [MessageFlags.Ephemeral],
        });
      }
      const idx = partyMems.map((pm) => pm.id).indexOf(i.customId);
      if (idx === -1)
        return await i.reply({
          content: "Error: Could not find member in party.",
          flags: [MessageFlags.Ephemeral],
        });

      partyMems.splice(idx, 1);
      return await i.update(
        renderActiveParty(interaction.user, partyMems, monster)
      );
    }
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
