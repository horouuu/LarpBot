type MonsterMetaData = {
  [monsterId: number]: {
    teamBoss: boolean;
    partySizes: number[];
    cooldowns: number[];
  };
};

export const metadata: MonsterMetaData = {
  13447: {
    teamBoss: true,
    partySizes: [1, 2, 3, 4, 5],
    cooldowns: [120 * 60, 30 * 60, 20 * 60, 15 * 60, 10 * 60],
  },
  14176: {
    teamBoss: true,
    partySizes: [1, 2],
    cooldowns: [6 * 60, 3 * 60],
  },
  319: {
    teamBoss: true,
    partySizes: [1, 2, 3],
    cooldowns: [1 * 60, 30, 15],
  },
  12192: {
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12215: {
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12224: {
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12205: {
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
};
