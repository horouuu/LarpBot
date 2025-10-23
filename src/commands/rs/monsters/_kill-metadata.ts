type MonsterMetaData = {
  [monsterId: number]: {
    teamBoss: boolean;
    partySizes: number[];
    cooldowns: number[];
  };
};

export const metadata: MonsterMetaData = {
  13447: {
    // Nex
    teamBoss: true,
    partySizes: [1, 2, 3, 4, 5],
    cooldowns: [120 * 60, 30 * 60, 20 * 60, 15 * 60, 10 * 60],
  },
  14176: {
    // Yama
    teamBoss: true,
    partySizes: [1, 2],
    cooldowns: [6 * 60, 3 * 60],
  },
  319: {
    // Corporeal Beast
    teamBoss: true,
    partySizes: [1, 2, 3],
    cooldowns: [1 * 60, 30, 15],
  },
  12192: {
    // Awakened Duke
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12215: {
    // Awakened Leviathan
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12224: {
    //Awakened Vardorvis
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  12205: {
    // Awakened Whisperer
    teamBoss: false,
    partySizes: [1],
    cooldowns: [5 * 60],
  },
  9118: {
    // Rabbit
    teamBoss: false,
    partySizes: [1],
    cooldowns: [30 * 60],
  },
  12077: {
    // Phantom Muspah
    teamBoss: false,
    partySizes: [1],
    cooldowns: [15],
  },
};
