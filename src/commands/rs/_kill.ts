import { CommandContext } from "@types-local/commands";
import { Monster, Monsters, Util } from "oldschooljs";
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

function getInMemoryPartyKey(userId: string) {
  return `${userId}:parties`;
}

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
  const partyMinMet = partyMems.length + 1 >= Math.min(...partySizes);
  const partyFull = partyMems.length + 1 >= Math.max(...partySizes);
  const cdList = partySizes
    .map((e, i) => `${e}: ${cooldowns[i] / 60} minutes`)
    .join("\n");

  const newMems = partyMems.map((pm) => `- ${pm}`).join("\n");
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(partyFull ? "Blue" : partyMinMet ? "Aqua" : "DarkAqua")
        .setTitle(
          `${monster.name}: ${partyLead.displayName}'s party${
            partyFull ? " (FULL)" : ""
          }`
        )
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
          .setStyle(ButtonStyle.Success)
          .setDisabled(partyFull),
        new ButtonBuilder()
          .setCustomId("disband")
          .setLabel("Disband")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("start")
          .setLabel("Start")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!partyMinMet)
      ),
      partyMems.length > 0
        ? new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...partyMems.map((p) =>
              new ButtonBuilder()
                .setCustomId(Math.random().toString())
                .setLabel(`Remove ${p.displayName}`)
                .setStyle(ButtonStyle.Danger)
            )
          )
        : null,
    ].filter((r) => r !== null),
  };
}

async function killTeamMonster(ctx: CommandContext, monster: Monster) {
  const { interaction, storage } = ctx;
  storage.setInMemory(
    getInMemoryPartyKey(interaction.user.id),
    monster.id.toString()
  );
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

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${monster.name}: ${interaction.user.displayName}'s party`
            )
            .setColor("DarkRed")
            .setDescription("Party expired."),
        ],
        components: [],
      });
    }

    storage.delInMemory(getInMemoryPartyKey(interaction.user.id));
  });

  collector.on("collect", async (i) => {
    const partyFull = partyMems.length + 1 >= Math.max(...partySizes);
    if (i.customId === "join") {
      if (i.user.id === interaction.user.id || partyMems.includes(i.user)) {
        return await i.reply({
          content: "You are already in this party.",
          flags: [MessageFlags.Ephemeral],
        });
      } else if (partyFull) {
        return await i.reply({
          content: "This party is full!",
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

      storage.delInMemory(getInMemoryPartyKey(interaction.user.id));
      return collector.stop();
    } else if (i.customId === "start") {
      if (i.user.id !== interaction.user.id) {
        return await i.reply({
          content: "Only the party leader can start the kill.",
          flags: [MessageFlags.Ephemeral],
        });
      }

      const cds: [number, User][] = await Promise.all(
        [interaction.user, ...partyMems].map(async (pm) => [
          await storage.checkKillCd(pm.id, monster.id),
          pm,
        ])
      );

      const onCd = cds.flatMap((cd) =>
        cd[0] > 0
          ? [`${cd[1]}: ${Math.floor(cd[0] / 60)} mins ${cd[0] % 60} secs`]
          : []
      );

      if (onCd.length > 0) {
        return await i.reply({
          content: `The following members are on cooldown for ${
            monster.name
          }:\n${onCd.join("\n")}`,
          flags: [MessageFlags.Ephemeral],
        });
      }

      const rewards = monster.kill(1, {}).items();
      const { got, total, totalRaw } = parseLoot(rewards);
      const giveRewardsTo = [
        interaction.user.id,
        ...partyMems.map((pm) => pm.id),
      ];
      const finalCoins = Math.floor(totalRaw / (partyMems.length + 1));
      const memList = [interaction.user, ...partyMems]
        .map((pm) => `- ${pm} (+${Util.toKMB(finalCoins)})`)
        .join("\n");

      const cooldownIdx = Math.max(partySizes.indexOf(partyMems.length + 1), 0);
      const cooldown = cooldowns[cooldownIdx];

      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle(`Nex: ${interaction.user.displayName}'s party (success)`)
            .setDescription(
              `Success! You killed Nex for:\n${got}\n\n${
                partyMems.length > 0
                  ? `Rewards have been sold and split equally amongst party members:\n${memList}\nTotal: ${total}`
                  : `You killed ${monster.name} alone, so you reaped all the rewards! (${total})`
              }\n\n${
                partyMems.length > 0 ? "**Each member has " : "**You have "
              } been put on a cooldown for ${monster.name} for ${
                cooldown / 60
              } minutes.**`
            ),
        ],
        components: [],
      });

      for (const id of giveRewardsTo) {
        await storage.updateCoins(id, finalCoins);
        await storage.setKillCd(id, monster.id, cooldown);
      }

      storage.delInMemory(getInMemoryPartyKey(interaction.user.id));
      collector.stop();
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
  const { interaction, storage } = ctx;
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

  const cooldown = await storage.checkKillCd(interaction.user.id, found.id);

  if (cooldown > 0) {
    return await interaction.reply({
      content: `You are currently on cooldown for monster: ${
        found.name
      }.\nYou can try again in \`${Math.floor(cooldown / 60)} minutes and ${
        cooldown % 60
      } seconds.\``,
      flags: [MessageFlags.Ephemeral],
    });
  }

  if (found.id in metadata) {
    const { teamBoss, cooldowns } = metadata[found.id];
    if (teamBoss) {
      const existingParty = storage.getInMemory(
        getInMemoryPartyKey(interaction.user.id)
      );

      if (!existingParty) {
        await killTeamMonster(ctx, found);
      } else {
        await interaction.reply({
          content: "You already have a party open.",
          flags: [MessageFlags.Ephemeral],
        });
      }
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
