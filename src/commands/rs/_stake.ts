import { promptConfirmationDialog } from "../lib/_cmd-utils.js";
import { CommandContext } from "@types-local/commands";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  User,
} from "discord.js";
import { Util } from "oldschooljs";

type StyleBonuses = {
  attack: number;
  strength: number;
  defence: number;
};

enum StakeEmoji {
  HP_CRITICAL = "🟥",
  HP_DANGER = "🟧",
  HP_SAFE = "🟩",
  HP_DEPLETED = "⬛",
  P_LOSER = "💀",
  P_WINNER = "🏆",
}

export function stake(p1: User, p2: User) {
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

  const resultBars = players.map((hp) => {
    const ratio = Math.max(hp / 99, 0);
    let emoji = StakeEmoji.HP_CRITICAL;
    if (ratio >= 0.75) {
      emoji = StakeEmoji.HP_SAFE;
    } else if (ratio > 0.25) {
      emoji = StakeEmoji.HP_DANGER;
    }

    const hpBar =
      emoji.repeat(Math.ceil(ratio * 10)) +
      StakeEmoji.HP_DEPLETED.repeat(10 - Math.ceil(ratio * 10));

    return hpBar;
  });

  return { players, logs, resultBars };
}

export async function sendStakeInvite(
  ctx: CommandContext,
  p1: User,
  p2: User,
  coins: number
) {
  const { interaction, storage } = ctx;
  const channel = interaction.channel;

  const announceDesc = `${p1} has challenged ${p2} to a ${
    coins > 0 ? "stake" : "duel"
  }${
    coins > 0 ? ` **for ${Util.toKMB(coins)} coins!**` : `!`
  }\n**Do you accept?**`;

  if (channel?.isSendable()) {
    const msg = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(coins > 0 ? "DarkRed" : "DarkAqua")
          .setTitle(`Challenge to ${p2.displayName}`)
          .setDescription(announceDesc),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("accept")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("decline")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
      allowedMentions: { parse: ["users"] },
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === p2.id,
      time: 15000,
      componentType: ComponentType.Button,
    });

    if (!msg.inGuild())
      return await interaction.editReply("Something went wrong.");

    collector.on("collect", async (i) => {
      if (i.customId === "accept") {
        if (coins > 0) {
          const p2coins = await storage.getCoins(p2.id);
          if (p2coins < coins) {
            collector.stop();
            return await i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor("DarkRed")
                  .setTitle(`Challenge to ${p2.displayName}`)
                  .setDescription(
                    `${p2} does not have enough coins to accept the stake.`
                  ),
              ],
              components: [],
            });
          }
        }
        const { players, resultBars } = stake(p1, p2);
        const p1Emoji =
          players[0] > players[1] ? StakeEmoji.P_WINNER : StakeEmoji.P_LOSER;

        const p2Emoji =
          players[1] > players[0] ? StakeEmoji.P_WINNER : StakeEmoji.P_LOSER;
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkGreen")
              .setTitle(
                `${
                  players[0] > players[1] ? p1.displayName : p2.displayName
                } won!`
              )
              .setDescription(
                `**Results**\n${p1}\n${p1Emoji} ${resultBars[0]}\n\n${p2}\n${p2Emoji} ${resultBars[1]}`
              ),
          ],
          components: [],
          allowedMentions: { parse: ["users"] },
        });

        const winner = players[0] > players[1] ? p1 : p2;
        const loser = players[0] > players[1] ? p2 : p1;

        if (coins > 0) {
          await storage.updateCoins(winner.id, coins);
          await storage.updateCoins(loser.id, coins * -1);
          const channel = interaction.channel;
          if (channel?.isSendable()) {
            await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor("DarkGold")
                  .setDescription(
                    `Withdrew ${Util.toKMB(
                      coins
                    )} coins from ${loser}'s bank and gave it to ${winner}.`
                  ),
              ],
              allowedMentions: { parse: ["users"] },
            });
          }
        }
      } else if (i.customId === "decline") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkRed")
              .setTitle(`Challenge to ${p2.displayName}`)
              .setDescription(`Challenge declined by ${p2}.`),
          ],
          components: [],
        });
      }
      collector.stop();
    });

    collector.on("ignore", async (i) => {
      await i.reply({
        content:
          "Only the person to whom the stake was issued can accept or decline the challenge.",
        flags: [MessageFlags.Ephemeral],
      });
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("DarkRed")
              .setTitle(`Challenge to ${p2.displayName}`)
              .setDescription("Challenge expired."),
          ],
          components: [],
        });
      }
    });
  } else {
    return await interaction.reply({
      content: "Something went wrong.",
      flags: MessageFlags.Ephemeral,
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
  const coinsValue = Util.fromKMB(coins);
  const p1Coins = await storage.getCoins(p1.id);
  if (p1Coins < coinsValue)
    return await interaction.reply({
      content: `You do not have enough coins to do this stake.\nRequested: ${Util.toKMB(
        coinsValue
      )}\nYour coins: ${Util.toKMB(p1Coins)}`,
      flags: MessageFlags.Ephemeral,
    });

  if (coinsValue > 0) {
    const handleConfirm = async (i: ButtonInteraction) => {
      await sendStakeInvite(ctx, p1, p2, coinsValue);
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("DarkRed")
            .setDescription(`Stake request sent.`),
        ],
        components: [],
      });
    };

    const handleCancel = async (i: ButtonInteraction) => {
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor("DarkRed")
            .setDescription(`Stake request cancelled.`),
        ],
        components: [],
      });
    };

    const handleExpiry = async () => {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("DarkRed")
            .setDescription(`Stake expired.`),
        ],
        components: [],
      });
    };

    await promptConfirmationDialog(
      interaction,
      {
        handleConfirm,
        handleCancel,
        handleExpiry,
      },
      {
        confirmButtonLabel: "Yes",
        cancelButtonLabel: "No",
        title: `Staking: ${p2.displayName}`,
        prompt: `Are you sure you want to stake ${p2} for ${Util.toKMB(
          coinsValue
        )} coins?`,
      }
    );
  } else {
    await sendStakeInvite(ctx, p1, p2, 0);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("DarkRed")
          .setDescription(`Stake request sent.`),
      ],
      components: [],
      flags: [MessageFlags.Ephemeral],
    });
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

  if (p1.id === p2.id)
    return await interaction.reply({
      content: "You cannot stake yourself!",
      flags: [MessageFlags.Ephemeral],
    });

  await confirmStake(ctx, p1, p2, coins);
}
