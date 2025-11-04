import { CommandContext } from "@types-local/commands";
import { Monster, Util } from "oldschooljs";
import { getMinsOrSecsText, getTierColor, parseLoot } from "./_rs-utils.js";
import { NewMonsters } from "./monsters/index.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandSubcommandBuilder,
  User,
} from "discord.js";
import { metadata } from "./monsters/_kill-metadata.js";

export const buildKillSubcommand = (opt: SlashCommandSubcommandBuilder) =>
  opt
    .setName("kill")
    .setDescription("Simulate killing a monster.")
    .addStringOption((opt) =>
      opt
        .setName("monster")
        .setDescription("Name of the monster to simulate killing.")
        .setRequired(true)
    );

function getInMemoryPartyKey(userId: string) {
  return `${userId}:parties`;
}

async function sendCooldownMessage(ctx: {
  i: ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>;
  cooldown: number;
  monster: Monster;
}): Promise<void> {
  const { i, cooldown, monster } = ctx;

  await i.reply({
    content: `You are currently on cooldown for monster: ${
      monster.name
    }.\nYou can try again in \`${Math.floor(cooldown / 60)} minutes and ${
      cooldown % 60
    } seconds\`.`,
    flags: [MessageFlags.Ephemeral],
  });
}

function renderActiveParty(
  partyLead: User,
  partyMems: User[],
  monster: Monster
) {
  const { partySizes, cooldowns } = metadata[monster.id];
  const partyMinMet = partyMems.length + 1 >= Math.min(...partySizes);
  const partyFull = partyMems.length + 1 >= Math.max(...partySizes);
  const cdList = partySizes
    .map((e, i) => `${e}: ${cooldowns[i] / 60} minute(s)`)
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
          .setCustomId("start")
          .setLabel("Start")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!partyMinMet),
        new ButtonBuilder()
          .setCustomId("join")
          .setLabel("Join")
          .setStyle(ButtonStyle.Success)
          .setDisabled(partyFull),
        new ButtonBuilder()
          .setCustomId("disband")
          .setLabel("Disband")
          .setStyle(ButtonStyle.Secondary)
      ),
      partyMems.length > 0
        ? new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...partyMems.map((p) =>
              new ButtonBuilder()
                .setCustomId(p.id)
                .setLabel(`Remove ${p.displayName}`)
                .setStyle(ButtonStyle.Danger)
            )
          )
        : null,
    ].filter((r) => r !== null),
  };
}

async function handleJoin(
  ctx: CommandContext & {
    i: ButtonInteraction<CacheType>;
    monster: Monster;
    partyMems: User[];
    partyFull: boolean;
    onCd: { [userId: string]: number };
  }
) {
  const { interaction, storage, i, monster, partyMems, partyFull, onCd } = ctx;
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
  } else if (!(i.user.id in onCd)) {
    const cooldown = await storage.checkKillCd(i.user.id, monster.id);

    if (cooldown > 0) {
      onCd[i.user.id] = cooldown;
      return await sendCooldownMessage({ i, cooldown, monster });
    }

    partyMems.push(i.user);
    return await i.update(
      renderActiveParty(interaction.user, partyMems, monster)
    );
  } else {
    // we prevent spam to DB by repeated calls
    const cooldown = onCd[i.user.id];
    return await sendCooldownMessage({ i, cooldown, monster });
  }
}

async function handleDisband(
  ctx: CommandContext & { i: ButtonInteraction<CacheType>; monster: Monster }
): Promise<boolean> {
  const { interaction, storage, i, monster } = ctx;
  if (i.user.id !== interaction.user.id) {
    await i.reply({
      content: "Only the party leader may disband the party.",
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  await i.update({
    embeds: [
      new EmbedBuilder()
        .setColor("DarkRed")
        .setTitle(`${monster.name}: ${interaction.user.displayName}'s party`)
        .setDescription("Party disbanded."),
    ],
    components: [],
  });

  storage.delInMemory(getInMemoryPartyKey(interaction.user.id));
  return true;
}

async function handleStart(
  ctx: CommandContext & {
    i: ButtonInteraction<CacheType>;
    monster: Monster;
    partyMems: User[];
    partySizes: number[];
    cooldowns: number[];
  }
): Promise<boolean> {
  const { interaction, storage, i, monster, partyMems, partySizes, cooldowns } =
    ctx;
  if (i.user.id !== interaction.user.id) {
    await i.reply({
      content: "Only the party leader can start the kill.",
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  const cds: [number, User][] = await Promise.all(
    [interaction.user, ...partyMems].map(async (pm) => [
      await storage.checkKillCd(pm.id, monster.id),
      pm,
    ])
  );

  [interaction.user, ...partyMems].forEach(
    async (mem) => await storage.updateKcs(mem.id, [[monster.id, 1]])
  );

  const onCd = cds.flatMap((cd) =>
    cd[0] > 0
      ? [`${cd[1]}: ${Math.floor(cd[0] / 60)} mins ${cd[0] % 60} secs`]
      : []
  );

  if (onCd.length > 0) {
    await i.reply({
      content: `The following members are on cooldown for ${
        monster.name
      }:\n${onCd.join("\n")}`,
      flags: [MessageFlags.Ephemeral],
    });

    return false;
  }

  const rewards = monster.kill(1, {}).items();
  const { got, total, totalRaw } = parseLoot(rewards);
  const giveRewardsTo = [interaction.user.id, ...partyMems.map((pm) => pm.id)];
  const finalCoins = Math.floor(totalRaw / (partyMems.length + 1));
  const memList = [interaction.user, ...partyMems]
    .map((pm) => `- ${pm} (+${Util.toKMB(finalCoins)})`)
    .join("\n");

  const cooldownIdx = Math.max(partySizes.indexOf(partyMems.length + 1), 0);
  const cooldown = cooldowns[cooldownIdx];
  const content = {
    embeds: [
      new EmbedBuilder()
        .setColor(getTierColor(totalRaw, "Blurple"))
        .setTitle(
          `${monster.name}: ${interaction.user.displayName}'s party (success)`
        )
        .setDescription(
          `Success! You killed ${monster.name} for:\n${got}\n\n${
            partyMems.length > 0
              ? `Rewards have been sold and split equally amongst party members:\n${memList}\nTotal: ${total}`
              : `You killed ${monster.name} alone, so you reaped all the rewards! (${total})\nBanked all rewards.`
          }\n\n${
            partyMems.length > 0 ? "**Each member has " : "**You have "
          } been put on a cooldown for ${monster.name} for ${getMinsOrSecsText(
            cooldown
          )}.**`
        ),
    ],
    components: [],
  };

  await Promise.all([
    interaction.deleteReply(),
    i.channel?.isSendable() ? i.channel.send(content) : i.reply(content),
  ]);

  if (partyMems.length > 0) {
    for (const id of giveRewardsTo) {
      await storage.updateCoins(id, finalCoins);
      await storage.setKillCd(id, monster.id, cooldown);
    }
  } else {
    await storage.updateInventory(interaction.user.id, rewards);
    await storage.setKillCd(interaction.user.id, monster.id, cooldown);
  }

  storage.delInMemory(getInMemoryPartyKey(interaction.user.id));
  return true;
}

async function handleRemove(
  ctx: CommandContext & {
    i: ButtonInteraction<CacheType>;
    monster: Monster;
    partyMems: User[];
  }
) {
  const { interaction, i, monster, partyMems } = ctx;
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

async function killTeamMonster(ctx: CommandContext, monster: Monster) {
  const { interaction, storage } = ctx;
  storage.setInMemory(
    getInMemoryPartyKey(interaction.user.id),
    monster.id.toString()
  );
  const { partySizes, cooldowns } = metadata[monster.id];
  const partyMems: User[] = [];
  const msg = await interaction.reply({
    ...renderActiveParty(interaction.user, partyMems, monster),
    withResponse: true,
  });

  const collector = msg.resource?.message?.createMessageComponentCollector({
    filter: (i) => !i.user.bot,
    time: 120 * 1000,
    componentType: ComponentType.Button,
  });

  collector?.on("end", async (_, reason) => {
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

  const onCd: { [userId: string]: number } = {};
  collector?.on("collect", async (i) => {
    if (i.customId === "join") {
      const partyFull = partyMems.length + 1 >= Math.max(...partySizes);
      await handleJoin({ ...ctx, i, monster, partyMems, partyFull, onCd });
    } else if (i.customId === "disband") {
      const disbanded = await handleDisband({ ...ctx, i, monster });
      if (disbanded) return collector.stop();
      return collector.stop();
    } else if (i.customId === "start") {
      const started = await handleStart({
        ...ctx,
        i,
        monster,
        partyMems,
        partySizes,
        cooldowns,
      });

      if (started) return collector.stop();
    } else {
      await handleRemove({ ...ctx, i, monster, partyMems });
    }
  });
}

async function killSoloMonster(
  ctx: CommandContext,
  monster: Monster,
  cds: number[] | null
) {
  const { interaction, storage } = ctx;
  const rewards = monster.kill(1, {}).items();
  const { got, total, totalRaw } = parseLoot(rewards);
  const content = {
    embeds: [
      new EmbedBuilder()
        .setAuthor({
          name: interaction.user.displayName,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle(`${monster.name}`)
        .setDescription(`${got}\n\n**Banked all loot (${total}).**`)
        .setURL(monster.data.wikiURL)
        .setFooter(
          cds
            ? {
                text: `\n\nYou have been put on a cooldown for ${
                  monster.name
                } for ${getMinsOrSecsText(cds[0])}.`,
              }
            : null
        )
        .setColor(getTierColor(totalRaw, "DarkOrange")),
    ],
  };

  const cooldownToSet = cds && cds.length > 0 ? cds[0] : null;
  await storage.updateInventory(interaction.user.id, rewards);
  if (cooldownToSet) {
    await storage.setKillCd(interaction.user.id, monster.id, cooldownToSet);
  }

  await storage.updateKcs(ctx.interaction.user.id, [[monster.id, 1]]);
  await storage.updateInventory(interaction.user.id, rewards);
  await interaction.reply(content);
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
      }.\nYou can try again in \`${getMinsOrSecsText(cooldown, "verbose")}\`.`,
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
    } else {
      await killSoloMonster(ctx, found, cooldowns);
    }
  } else {
    await killSoloMonster(ctx, found, null);
  }
}
