export type RpgRelicRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "unique"
  | "legendary"
  | "mystic";

export type RpgRelicEffectKey =
  | "attackPercent"
  | "attackRangePercent"
  | "attackSpeedPercent"
  | "criticalChancePercent"
  | "criticalDamagePercent"
  | "damageReductionPercent"
  | "goldPercent"
  | "killHeal"
  | "maxHp"
  | "moveSpeedPercent"
  | "retaliationDamage"
  | "skillCooldownPercent"
  | "skillDamagePercent";

export interface RpgRelicEffect {
  baseValue: number;
  duplicateStep: number;
  key: RpgRelicEffectKey;
}

export interface RpgRelicDefinition {
  description: string;
  effects: readonly RpgRelicEffect[];
  icon: string;
  id: string;
  name: string;
  rarity: RpgRelicRarity;
}

export const RPG_RELIC_RARITIES: Readonly<
  Record<
    RpgRelicRarity,
    { color: string; label: string; normalDropWeight: number }
  >
> = {
  common: { color: "#9ba5a0", label: "보통", normalDropWeight: 55 },
  uncommon: { color: "#65b77a", label: "희귀", normalDropWeight: 28 },
  rare: { color: "#4f9de8", label: "레어", normalDropWeight: 12 },
  unique: { color: "#bb68dd", label: "유니크", normalDropWeight: 5 },
  legendary: { color: "#f1aa38", label: "레전더리", normalDropWeight: 0 },
  mystic: { color: "#ff3f4d", label: "미스틱", normalDropWeight: 0 },
};

const relicIcon = (id: string) =>
  `/assets/pixel-art/rpg/adventure/relics/${id}.png`;

const effect = (
  key: RpgRelicEffectKey,
  baseValue: number,
  duplicateStep = 1,
): RpgRelicEffect => ({ baseValue, duplicateStep, key });

export const RPG_RELICS = [
  {
    id: "iron-heart",
    name: "강철 심장",
    rarity: "common",
    description: "최대 체력 +18 · 중복마다 최대 체력 +1",
    icon: relicIcon("iron-heart"),
    effects: [effect("maxHp", 18)],
  },
  {
    id: "wind-boots",
    name: "바람 장화",
    rarity: "common",
    description: "이동 속도 +8% · 중복마다 +1%",
    icon: relicIcon("wind-boots"),
    effects: [effect("moveSpeedPercent", 8)],
  },
  {
    id: "greedy-pouch",
    name: "욕심 많은 주머니",
    rarity: "common",
    description: "골드 획득 +30% · 중복마다 +1%",
    icon: relicIcon("greedy-pouch"),
    effects: [effect("goldPercent", 30)],
  },
  {
    id: "ember-ring",
    name: "불씨 반지",
    rarity: "uncommon",
    description: "공격력 +10% · 중복마다 +1%",
    icon: relicIcon("ember-ring"),
    effects: [effect("attackPercent", 10)],
  },
  {
    id: "sun-chalice",
    name: "태양의 잔",
    rarity: "uncommon",
    description: "적 처치 시 체력 2 회복 · 중복마다 +1",
    icon: relicIcon("sun-chalice"),
    effects: [effect("killHeal", 2)],
  },
  {
    id: "guardian-mark",
    name: "수호자의 문장",
    rarity: "uncommon",
    description: "받는 피해 -8% · 중복마다 -1%",
    icon: relicIcon("guardian-mark"),
    effects: [effect("damageReductionPercent", 8)],
  },
  {
    id: "wolf-eye",
    name: "회색 늑대의 눈",
    rarity: "rare",
    description: "치명타 확률 +7% · 중복마다 +1%",
    icon: relicIcon("wolf-eye"),
    effects: [effect("criticalChancePercent", 7)],
  },
  {
    id: "thorn-cloak",
    name: "가시 망토",
    rarity: "rare",
    description: "피격 시 주위 적에게 1 피해 · 중복마다 +1",
    icon: relicIcon("thorn-cloak"),
    effects: [effect("retaliationDamage", 1)],
  },
  {
    id: "cracked-hourglass",
    name: "금이 간 모래시계",
    rarity: "rare",
    description: "스킬 재사용 대기시간 -12% · 중복마다 -1%",
    icon: relicIcon("cracked-hourglass"),
    effects: [effect("skillCooldownPercent", 12)],
  },
  {
    id: "war-drum",
    name: "진군의 전고",
    rarity: "unique",
    description: "공격 속도 +10% · 중복마다 +1%",
    icon: relicIcon("war-drum"),
    effects: [effect("attackSpeedPercent", 10)],
  },
  {
    id: "moon-mirror",
    name: "월식의 거울",
    rarity: "unique",
    description: "받는 피해 -6%, 스킬 피해 +8% · 중복마다 각각 +1%",
    icon: relicIcon("moon-mirror"),
    effects: [
      effect("damageReductionPercent", 6),
      effect("skillDamagePercent", 8),
    ],
  },
  {
    id: "hunter-fang",
    name: "심연 사냥꾼의 송곳니",
    rarity: "unique",
    description: "공격력 +6%, 치명타 피해 +15% · 중복마다 각각 +1%",
    icon: relicIcon("hunter-fang"),
    effects: [
      effect("attackPercent", 6),
      effect("criticalDamagePercent", 15),
    ],
  },
  {
    id: "phoenix-feather",
    name: "불사조의 깃",
    rarity: "legendary",
    description: "최대 체력 +30, 처치 회복 +3 · 중복마다 각각 +1",
    icon: relicIcon("phoenix-feather"),
    effects: [effect("maxHp", 30), effect("killHeal", 3)],
  },
  {
    id: "abyss-crown",
    name: "심연왕의 관",
    rarity: "legendary",
    description: "공격력 +20%, 스킬 피해 +20% · 중복마다 각각 +1%",
    icon: relicIcon("abyss-crown"),
    effects: [
      effect("attackPercent", 20),
      effect("skillDamagePercent", 20),
    ],
  },
  {
    id: "king-chain",
    name: "고대룡의 비늘",
    rarity: "legendary",
    description: "받는 피해 -12%, 공격 범위 +15% · 중복마다 각각 +1%",
    icon: relicIcon("king-chain"),
    effects: [
      effect("damageReductionPercent", 12),
      effect("attackRangePercent", 15),
    ],
  },
  {
    id: "scarlet-moon-heart",
    name: "적월의 심장",
    rarity: "mystic",
    description: "최대 체력 +60, 처치 회복 +6, 받는 피해 -10%",
    icon: relicIcon("scarlet-moon-heart"),
    effects: [
      effect("maxHp", 60),
      effect("killHeal", 6),
      effect("damageReductionPercent", 10),
    ],
  },
  {
    id: "doom-crown",
    name: "멸망을 삼킨 왕관",
    rarity: "mystic",
    description: "공격력·스킬 피해 +35%, 치명타 확률 +10%",
    icon: relicIcon("doom-crown"),
    effects: [
      effect("attackPercent", 35),
      effect("skillDamagePercent", 35),
      effect("criticalChancePercent", 10),
    ],
  },
  {
    id: "beyond-time-core",
    name: "피안의 시간핵",
    rarity: "mystic",
    description: "스킬 재사용 -28%, 공격 속도 +20%, 이동 속도 +12%",
    icon: relicIcon("beyond-time-core"),
    effects: [
      effect("skillCooldownPercent", 28),
      effect("attackSpeedPercent", 20),
      effect("moveSpeedPercent", 12),
    ],
  },
] as const satisfies readonly RpgRelicDefinition[];

export type RpgRelicId = (typeof RPG_RELICS)[number]["id"];
export type RpgRelicLevels = Partial<Record<RpgRelicId, number>>;

export type RpgRelicBonuses = Record<RpgRelicEffectKey, number>;

const RPG_RELIC_RARITY_RANK: Readonly<Record<RpgRelicRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  unique: 3,
  legendary: 4,
  mystic: 5,
};

const RPG_RELIC_CATALOG_RANK = new Map<RpgRelicId, number>(
  RPG_RELICS.map((relic, index) => [relic.id, index]),
);

export function getRpgRelic(id: RpgRelicId) {
  return RPG_RELICS.find((relic) => relic.id === id);
}

export function sortRpgRelicIdsByRarity(
  relicIds: readonly RpgRelicId[],
): RpgRelicId[] {
  return [...relicIds].sort((leftId, rightId) => {
    const left = getRpgRelic(leftId);
    const right = getRpgRelic(rightId);
    const rarityDifference =
      RPG_RELIC_RARITY_RANK[left?.rarity ?? "common"] -
      RPG_RELIC_RARITY_RANK[right?.rarity ?? "common"];

    return (
      rarityDifference ||
      (RPG_RELIC_CATALOG_RANK.get(leftId) ?? Number.MAX_SAFE_INTEGER) -
        (RPG_RELIC_CATALOG_RANK.get(rightId) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

export function getRpgRelicEffectValue(
  relicEffect: RpgRelicEffect,
  level: number,
) {
  const normalizedLevel = Math.max(0, Math.floor(level));
  if (normalizedLevel === 0) {
    return 0;
  }
  return (
    relicEffect.baseValue +
    (normalizedLevel - 1) * relicEffect.duplicateStep
  );
}

export function getRpgRelicBonuses(
  levels: RpgRelicLevels,
): RpgRelicBonuses {
  const bonuses: RpgRelicBonuses = {
    attackPercent: 0,
    attackRangePercent: 0,
    attackSpeedPercent: 0,
    criticalChancePercent: 0,
    criticalDamagePercent: 0,
    damageReductionPercent: 0,
    goldPercent: 0,
    killHeal: 0,
    maxHp: 0,
    moveSpeedPercent: 0,
    retaliationDamage: 0,
    skillCooldownPercent: 0,
    skillDamagePercent: 0,
  };

  for (const relic of RPG_RELICS) {
    const level = levels[relic.id] ?? 0;
    for (const relicEffect of relic.effects) {
      bonuses[relicEffect.key] += getRpgRelicEffectValue(
        relicEffect,
        level,
      );
    }
  }

  bonuses.damageReductionPercent = Math.min(
    75,
    bonuses.damageReductionPercent,
  );
  bonuses.criticalChancePercent = Math.min(
    80,
    bonuses.criticalChancePercent,
  );
  bonuses.skillCooldownPercent = Math.min(
    70,
    bonuses.skillCooldownPercent,
  );
  return bonuses;
}

function pickRelic(
  pool: readonly (typeof RPG_RELICS)[number][],
  rng: () => number,
) {
  const index = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(rng() * pool.length)),
  );
  return pool[index];
}

export function rollRpgRelicDrop({
  boss,
  rng = Math.random,
  theme = "cave",
}: {
  boss: boolean;
  rng?: () => number;
  theme?: "cave" | "snow";
}) {
  if (boss) {
    const mysticChance = theme === "snow" ? 0.55 : 0.25;
    const rarity: RpgRelicRarity =
      rng() < mysticChance ? "mystic" : "legendary";
    return pickRelic(
      RPG_RELICS.filter((relic) => relic.rarity === rarity),
      rng,
    );
  }

  if (rng() >= 0.12) {
    return undefined;
  }

  const rarityRoll = rng() * 100;
  let cursor = 0;
  let rarity: RpgRelicRarity = "common";
  for (const candidate of [
    "common",
    "uncommon",
    "rare",
    "unique",
  ] as const) {
    cursor += RPG_RELIC_RARITIES[candidate].normalDropWeight;
    if (rarityRoll < cursor) {
      rarity = candidate;
      break;
    }
  }

  return pickRelic(
    RPG_RELICS.filter((relic) => relic.rarity === rarity),
    rng,
  );
}
