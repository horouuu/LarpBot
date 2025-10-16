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
