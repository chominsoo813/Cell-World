export type RpgBaseClassId =
  | "archer"
  | "assassin"
  | "mage"
  | "pirate"
  | "warrior";

export type RpgPromotionClassId =
  | "brawler"
  | "crossbow"
  | "daggerist"
  | "firemage"
  | "frostmage"
  | "greatsword"
  | "gunslinger"
  | "longbow"
  | "ninja"
  | "plunder_captain"
  | "spearman"
  | "storm_captain"
  | "stormmage"
  | "swordmaster"
  | "toxicmage";

export type RpgClassId =
  | "adventurer"
  | RpgBaseClassId
  | RpgPromotionClassId;

export type RpgSkillEffect =
  | "barrage"
  | "chain"
  | "dash"
  | "hook"
  | "line"
  | "nova"
  | "spin"
  | "tornado"
  | "volley";

export interface RpgClassDefinition {
  id: RpgClassId;
  name: string;
  title: string;
  description: string;
  tier: 0 | 1 | 2;
  parentId?: RpgBaseClassId | "adventurer";
  spriteFile: string;
  iconFile: string;
  accent: string;
  skill: {
    name: string;
    description: string;
    effect: RpgSkillEffect;
    color: number;
    cooldownMs: number;
    power: number;
    range: number;
    durationMs?: number;
    stunMs?: number;
  };
}

const CHARACTER_ROOT = "/assets/pixel-art/rpg/adventure/characters";
const SKILL_ICON_ROOT = "/assets/pixel-art/rpg/adventure/skill-icons";

function classDefinition(
  definition: Omit<RpgClassDefinition, "iconFile" | "spriteFile">,
): RpgClassDefinition {
  return {
    ...definition,
    iconFile: `${SKILL_ICON_ROOT}/${definition.id}.png`,
    spriteFile: `${CHARACTER_ROOT}/${definition.id}.png`,
  };
}

export const RPG_CLASS_IDS = [
  "adventurer",
  "warrior",
  "assassin",
  "mage",
  "archer",
  "pirate",
  "swordmaster",
  "greatsword",
  "spearman",
  "ninja",
  "daggerist",
  "brawler",
  "firemage",
  "frostmage",
  "stormmage",
  "toxicmage",
  "longbow",
  "crossbow",
  "gunslinger",
  "plunder_captain",
  "storm_captain",
] as const satisfies readonly RpgClassId[];

export const RPG_CLASS_DEFINITIONS: Readonly<
  Record<RpgClassId, RpgClassDefinition>
> = {
  adventurer: classDefinition({
    id: "adventurer",
    name: "모험가",
    title: "셀 월드의 신입 탐험가",
    description: "검과 발걸음만으로 자신의 길을 개척하는 기본 직업입니다.",
    tier: 0,
    accent: "#e8c98f",
    skill: {
      name: "회전 검무",
      description: "2초 동안 회전하며 검을 휘둘러 주변 적을 연속 공격합니다.",
      effect: "spin",
      color: 0xffd36a,
      cooldownMs: 4_500,
      durationMs: 2_000,
      power: 1,
      range: 132,
    },
  }),
  warrior: classDefinition({
    id: "warrior",
    name: "전사",
    title: "불굴의 방패",
    description: "튼튼한 방어력과 돌진력으로 전선을 지키는 근접 직업입니다.",
    tier: 1,
    parentId: "adventurer",
    accent: "#ff8145",
    skill: {
      name: "방패 돌진",
      description: "정면으로 돌진한 뒤 충격파로 주변 적을 타격합니다.",
      effect: "dash",
      color: 0xff8145,
      cooldownMs: 4_200,
      durationMs: 520,
      power: 3,
      range: 155,
      stunMs: 550,
    },
  }),
  assassin: classDefinition({
    id: "assassin",
    name: "암살자",
    title: "그림자 추적자",
    description: "정지한 자리에서 날카로운 X자 참격으로 빈틈을 노리는 직업입니다.",
    tier: 1,
    parentId: "adventurer",
    accent: "#d57bff",
    skill: {
      name: "그림자 십자참",
      description: "돌진하지 않고 제자리에서 X자 참격을 두 번 날려 주변 적을 벱니다.",
      effect: "nova",
      color: 0xd57bff,
      cooldownMs: 3_800,
      durationMs: 460,
      power: 3,
      range: 140,
    },
  }),
  mage: classDefinition({
    id: "mage",
    name: "마법사",
    title: "별빛꽃의 현자",
    description: "마력 폭발로 넓은 범위의 적을 제압하는 원거리 직업입니다.",
    tier: 1,
    parentId: "adventurer",
    accent: "#65d9ff",
    skill: {
      name: "유성 폭발",
      description: "푸른 마법진을 펼쳐 넓은 범위에 연쇄 폭발을 일으킵니다.",
      effect: "line",
      color: 0x65d9ff,
      cooldownMs: 5_200,
      power: 4,
      range: 190,
    },
  }),
  archer: classDefinition({
    id: "archer",
    name: "궁수",
    title: "바람의 사냥꾼",
    description: "정확한 사격과 넓은 공격 범위로 거리를 지배합니다.",
    tier: 1,
    parentId: "adventurer",
    accent: "#b4ed62",
    skill: {
      name: "폭풍 화살",
      description: "조준 방향으로 바람 화살 다섯 발을 부채꼴로 발사합니다.",
      effect: "volley",
      color: 0xb4ed62,
      cooldownMs: 4_000,
      power: 3,
      range: 480,
    },
  }),
  pirate: classDefinition({
    id: "pirate",
    name: "해적",
    title: "화약의 무법자",
    description: "화약 무기와 기동력으로 중거리를 휘어잡는 직업입니다.",
    tier: 1,
    parentId: "adventurer",
    accent: "#50e0cb",
    skill: {
      name: "화약 난사",
      description: "조준 방향으로 폭발탄을 연속 발사하고 마지막 탄을 폭발시킵니다.",
      effect: "barrage",
      color: 0x50e0cb,
      cooldownMs: 4_400,
      power: 2,
      range: 430,
    },
  }),
  swordmaster: classDefinition({
    id: "swordmaster",
    name: "검사",
    title: "빈틈을 가르는 검객",
    description: "빠른 연속 검격으로 모든 방향의 적을 압박합니다.",
    tier: 2,
    parentId: "warrior",
    accent: "#ffd166",
    skill: {
      name: "십연속 검무",
      description: "1.4초 동안 더 빠르게 회전하며 주변을 연속 베어냅니다.",
      effect: "spin",
      color: 0xffd166,
      cooldownMs: 3_200,
      durationMs: 1_400,
      power: 2,
      range: 154,
    },
  }),
  greatsword: classDefinition({
    id: "greatsword",
    name: "대검사",
    title: "강철을 깨는 거인",
    description: "무거운 대검의 강력한 일격으로 전장을 뒤흔듭니다.",
    tier: 2,
    parentId: "warrior",
    accent: "#ff6245",
    skill: {
      name: "대검 강하",
      description: "대검을 내리쳐 넓은 충격파를 일으키고 적을 기절시킵니다.",
      effect: "nova",
      color: 0xff6245,
      cooldownMs: 5_800,
      power: 7,
      range: 205,
      stunMs: 900,
    },
  }),
  spearman: classDefinition({
    id: "spearman",
    name: "창병",
    title: "선두를 꿰뚫는 창끝",
    description: "긴 공격 범위와 관통력으로 안전하게 적을 무너뜨립니다.",
    tier: 2,
    parentId: "warrior",
    accent: "#63dce6",
    skill: {
      name: "필살 창 투척",
      description: "조준 방향으로 창을 던져 경로에 있는 모든 적을 관통합니다.",
      effect: "line",
      color: 0x63dce6,
      cooldownMs: 5_200,
      power: 6,
      range: 560,
    },
  }),
  ninja: classDefinition({
    id: "ninja",
    name: "닌자",
    title: "어둠을 건너는 그림자",
    description: "재빠른 몸놀림과 원거리 암기로 적진을 베어냅니다.",
    tier: 2,
    parentId: "assassin",
    accent: "#c980ff",
    skill: {
      name: "거대 표창 투척",
      description: "회전하는 거대 표창을 던져 경로의 적을 최대 4회 관통합니다.",
      effect: "line",
      color: 0xc980ff,
      cooldownMs: 4_200,
      power: 5,
      range: 520,
    },
  }),
  daggerist: classDefinition({
    id: "daggerist",
    name: "단검술사",
    title: "찰나를 베는 칼날",
    description: "쌍단검의 빠른 연격으로 목표를 순식간에 처형합니다.",
    tier: 2,
    parentId: "assassin",
    accent: "#ff70ba",
    skill: {
      name: "섬광 연속참",
      description: "조준 방향으로 돌진하며 닿은 적을 반복해서 베어냅니다.",
      effect: "dash",
      color: 0xff70ba,
      cooldownMs: 3_600,
      durationMs: 850,
      power: 3,
      range: 130,
    },
  }),
  brawler: classDefinition({
    id: "brawler",
    name: "격투가",
    title: "주먹으로 깨는 장인",
    description: "강한 체력과 충격파로 근접 전투를 지배합니다.",
    tier: 2,
    parentId: "assassin",
    accent: "#ff9d4d",
    skill: {
      name: "축기 붕권",
      description: "스킬키를 누르고 기를 모은 뒤 놓으면 전방으로 돌진해 강한 펀치를 날립니다.",
      effect: "dash",
      color: 0xff9d4d,
      cooldownMs: 4_800,
      power: 7,
      range: 170,
      stunMs: 650,
    },
  }),
  firemage: classDefinition({
    id: "firemage",
    name: "화염법사",
    title: "사막을 불태우는 불꽃",
    description: "강력한 화염 주문과 폭발 피해에 특화된 마법사입니다.",
    tier: 2,
    parentId: "mage",
    accent: "#ff6b32",
    skill: {
      name: "화염 유성",
      description: "타오르는 유성을 떨어뜨려 넓은 범위를 폭발시킵니다.",
      effect: "nova",
      color: 0xff6b32,
      cooldownMs: 6_000,
      power: 8,
      range: 250,
    },
  }),
  frostmage: classDefinition({
    id: "frostmage",
    name: "얼음 법사",
    title: "고요한 겨울의 주인",
    description: "얼음 장벽으로 적의 접근을 통제하는 마법사입니다.",
    tier: 2,
    parentId: "mage",
    accent: "#8de9ff",
    skill: {
      name: "빙하 고드름",
      description: "거대한 고드름을 소환해 주변 적을 얼리고 피해를 줍니다.",
      effect: "nova",
      color: 0x8de9ff,
      cooldownMs: 7_000,
      power: 5,
      range: 235,
      stunMs: 1_600,
    },
  }),
  stormmage: classDefinition({
    id: "stormmage",
    name: "번개 법사",
    title: "번개를 엮는 현자",
    description: "빠르게 전이되는 번개로 여러 적을 동시에 감전시킵니다.",
    tier: 2,
    parentId: "mage",
    accent: "#f5ed62",
    skill: {
      name: "연쇄 낙뢰",
      description: "가까운 적들을 차례로 잇는 번개를 방출합니다.",
      effect: "chain",
      color: 0xf5ed62,
      cooldownMs: 4_300,
      power: 5,
      range: 380,
      stunMs: 420,
    },
  }),
  toxicmage: classDefinition({
    id: "toxicmage",
    name: "독 법사",
    title: "부패를 기르는 연금술사",
    description: "맹독 지대와 지속 피해로 적 무리를 서서히 무너뜨립니다.",
    tier: 2,
    parentId: "mage",
    accent: "#7bea62",
    skill: {
      name: "맹독 투척",
      description: "독약병을 터뜨려 범위 안의 적을 여러 차례 중독시킵니다.",
      effect: "nova",
      color: 0x7bea62,
      cooldownMs: 6_400,
      durationMs: 2_800,
      power: 2,
      range: 225,
    },
  }),
  longbow: classDefinition({
    id: "longbow",
    name: "장궁",
    title: "하늘 끝을 겨누는 사수",
    description: "긴 사거리의 묵직한 한 발로 적의 방어선을 꿰뚫습니다.",
    tier: 2,
    parentId: "archer",
    accent: "#ffe96d",
    skill: {
      name: "차지 관통화살",
      description: "스킬키를 누르고 조준한 뒤 놓으면 충전 시간에 비례해 커지고 강해지는 관통화살을 발사합니다.",
      effect: "line",
      color: 0xffe96d,
      cooldownMs: 5_200,
      power: 8,
      range: 680,
    },
  }),
  crossbow: classDefinition({
    id: "crossbow",
    name: "석궁",
    title: "화살을 쏟아내는 사냥꾼",
    description: "빠른 연사로 먼 거리의 적에게 지속적인 피해를 줍니다.",
    tier: 2,
    parentId: "archer",
    accent: "#9fe85f",
    skill: {
      name: "십연발 쇠뇌",
      description: "조준 방향으로 관통 화살을 빠르게 열 발 발사합니다.",
      effect: "barrage",
      color: 0x9fe85f,
      cooldownMs: 4_800,
      power: 3,
      range: 560,
    },
  }),
  gunslinger: classDefinition({
    id: "gunslinger",
    name: "총포수",
    title: "화약 연기의 명사수",
    description: "권총과 소형 포를 빠르게 번갈아 사용하는 전문가입니다.",
    tier: 2,
    parentId: "pirate",
    accent: "#ff9a45",
    skill: {
      name: "십연발 속사",
      description: "조준 방향으로 탄환을 빠르게 열 발 발사합니다.",
      effect: "barrage",
      color: 0xff9a45,
      cooldownMs: 4_600,
      power: 3,
      range: 540,
    },
  }),
  plunder_captain: classDefinition({
    id: "plunder_captain",
    name: "약탈선장",
    title: "전리품을 거두는 지배자",
    description: "갈고리와 강인한 체력으로 적진을 장악합니다.",
    tier: 2,
    parentId: "pirate",
    accent: "#f2c14e",
    skill: {
      name: "약탈 갈고리",
      description: "갈고리를 던져 맞은 적을 앞으로 끌어당기고 타격합니다.",
      effect: "hook",
      color: 0xf2c14e,
      cooldownMs: 4_000,
      power: 6,
      range: 520,
      stunMs: 700,
    },
  }),
  storm_captain: classDefinition({
    id: "storm_captain",
    name: "폭풍 항해사",
    title: "폭풍을 다루는 항해사",
    description: "번개 같은 기동력과 폭풍으로 전장을 휩씁니다.",
    tier: 2,
    parentId: "pirate",
    accent: "#58eaff",
    skill: {
      name: "폭풍 토네이도",
      description: "조준 방향으로 전진하는 토네이도를 소환해 지속 피해를 줍니다.",
      effect: "tornado",
      color: 0x58eaff,
      cooldownMs: 7_000,
      durationMs: 2_600,
      power: 2,
      range: 580,
    },
  }),
};

export function isRpgClassId(value: unknown): value is RpgClassId {
  return (
    typeof value === "string" &&
    RPG_CLASS_IDS.includes(value as RpgClassId)
  );
}

export function getRpgClass(id: RpgClassId): RpgClassDefinition {
  return RPG_CLASS_DEFINITIONS[id];
}

export function getRpgJobChangeOptions(
  level: number,
  currentClassId: RpgClassId,
): RpgClassDefinition[] {
  const currentClass = getRpgClass(currentClassId);

  if (currentClass.tier === 0 && level >= 5) {
    return RPG_CLASS_IDS.map(getRpgClass).filter(
      (definition) =>
        definition.tier === 1 && definition.parentId === "adventurer",
    );
  }

  if (currentClass.tier === 1 && level >= 10) {
    return RPG_CLASS_IDS.map(getRpgClass).filter(
      (definition) =>
        definition.tier === 2 &&
        definition.parentId === currentClass.id,
    );
  }

  return [];
}

export const RPG_SECOND_JOB_SWITCH_LEVEL = 30;

export function getRpgSecondJobSwitchOptions(
  level: number,
  currentClassId: RpgClassId,
): RpgClassDefinition[] {
  const currentClass = getRpgClass(currentClassId);

  if (
    level < RPG_SECOND_JOB_SWITCH_LEVEL ||
    currentClass.tier !== 2 ||
    !currentClass.parentId ||
    currentClass.parentId === "adventurer"
  ) {
    return [];
  }

  return RPG_CLASS_IDS.map(getRpgClass).filter(
    (definition) =>
      definition.tier === 2 &&
      definition.parentId === currentClass.parentId &&
      definition.id !== currentClassId,
  );
}

export function getNextRpgJobChangeLevel(
  currentClassId: RpgClassId,
): 5 | 10 | null {
  const tier = getRpgClass(currentClassId).tier;
  return tier === 0 ? 5 : tier === 1 ? 10 : null;
}
