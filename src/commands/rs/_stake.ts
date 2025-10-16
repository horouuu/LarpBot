import { Command, CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  User,
} from "discord.js";
import { Util } from "oldschooljs";
import { fromKMB } from "oldschooljs/dist/util";

type StyleBonuses = {
  attack: number;
  strength: number;
  defence: number;
};

export async function stake(p1: User, p2: User, coins?: number) {
  const styleBonuses: StyleBonuses = {
    attack: 0,
    strength: 3,
    defence: 0,
  };

  const wepStrBonus = 89;
  const prayStrMult = 1;
  const strLvl = 99;
  const strBoost = 0;

  const wepAtkBonus = 89;
  const prayAtkMult = 1;
  const atkLvl = 99;
  const atkBoost = 0;

  const defLvl = 99;
  const defBonus = 0;
  const defBoost = 0;
  const prayDefMult = 1;

  const effStr =
    Math.floor((strLvl + strBoost) * prayStrMult) + styleBonuses.strength + 8;
  const maxHit = Math.floor((effStr * (wepStrBonus + 64) + 320) / 640);

  const effAtk =
    Math.floor((atkLvl + atkBoost) * prayAtkMult) + styleBonuses.attack;
  const atkRoll = Math.floor(effAtk * (wepAtkBonus + 64));

  const effDef =
    Math.floor((defLvl + defBoost) * prayDefMult) + styleBonuses.defence + 8;

  const defRoll = effDef * (defBonus + 64);

  let hitChance = 0;
  if (atkRoll > defRoll) {
    hitChance = 1 - (defRoll + 2) / (2 * (atkRoll + 1));
  } else {
    hitChance = atkRoll / (2 * (defRoll + 1));
  }

  // Person who initiated the command is p1
  const players = [99, 99];
  const users = [p1, p2];
  const logs = [];
  let ptr = Math.round(Math.random());
  while (players[0] > 0 && players[1] > 0) {
    const roll = Math.random();
    let dmg = 0;
    if (roll >= hitChance) {
      dmg = Math.round(Math.random() * maxHit) ?? 1;
    }

    players[ptr] -= dmg;
    logs.push(`${users[ptr]} hit ${users[(ptr + 1) % 2]} for ${dmg} damage!`);
    ptr = (ptr + 1) % 2;
  }
}

export async function sendStakeInvite(
  ctx: CommandContext,
  p1: User,
  p2: User,
  coins: number
) {
  const { interaction } = ctx;
  const channel = interaction.channel;

  const announceDesc = `${p1} has challenged ${p2} to a stake${
    coins > 0 ? ` for ${Util.toKMB(coins)} coins!` : `!`
  }`;

  if (channel?.isSendable()) {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("DarkRed")
          .setTitle("Stake Challenge")
          .setDescription(announceDesc),
      ],
    });
  }
}

export async function confirmStake(
  ctx: CommandContext,
  p1: User,
  p2: User,
  coins: string
) {
  const { interaction, storage } = ctx;
  const coinsValue = fromKMB(coins);
  const p1Coins = await storage.getCoins(p1.id);
  if (p1Coins < coinsValue)
    return await interaction.reply({
      content: `You do not have enough coins to do this stake.\nRequested: ${Util.toKMB(
        coinsValue
      )}\nYour coins: ${Util.toKMB(p1Coins)}`,
      flags: MessageFlags.Ephemeral,
    });

  if (coinsValue > 0) {
    const confirmEmbed = new EmbedBuilder()
      .setColor("DarkRed")
      .setDescription(
        `Are you sure you want to stake ${p2} for ${Util.toKMB(
          coinsValue
        )} coins?`
      );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("yes")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("no")
        .setLabel("No")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.reply({
      embeds: [confirmEmbed],
      components: [actionRow],
      flags: [MessageFlags.Ephemeral],
      withResponse: true,
    });

    const collector = msg.resource?.message?.createMessageComponentCollector({
      time: 15000,
      componentType: ComponentType.Button,
    });

    collector?.on("collect", async (i) => {
      if (i.customId === "no") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkRed")
              .setDescription(`Stake request cancelled.`),
          ],
          components: [],
        });
      } else if (i.customId === "yes") {
        await sendStakeInvite(ctx, p1, p2, coinsValue);
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkRed")
              .setDescription(`Stake request sent.`),
          ],
          components: [],
        });
      }

      collector.stop();
    });

    collector?.on("end", async (_, reason) => {
      if (reason === "time")
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkRed")
              .setDescription(`Stake expired.`),
          ],
          components: [],
        });
    });
  } else {
    await sendStakeInvite(ctx, p1, p2, 0);
  }
}

export async function startStake(ctx: CommandContext) {
  const { interaction } = ctx;
  const p1 = interaction.user;
  const p2 = interaction.options.getUser("opponent");
  const coins = interaction.options.getString("stake") ?? "0";
  const parsedCoins = Util.fromKMB(coins);

  if (Number.isNaN(parsedCoins))
    return await interaction.reply({
      content: `${coins} is not a valid input for the stake amount.`,
      flags: [MessageFlags.Ephemeral],
    });
  if (!p2)
    return await interaction.reply({
      content: "You must specify an opponent to stake.",
      flags: [MessageFlags.Ephemeral],
    });

  await confirmStake(ctx, p1, p2, coins);
}
