export const RPG_RELICS = [
  {
    id: "hunter-fang",
    name: "사냥꾼의 송곳니",
    description: "몬스터를 쓰러뜨린 자에게 반응하는 오래된 송곳니.",
    icon: "/assets/pixel-art/rpg/adventure/relics/hunter-fang.png",
  },
  {
    id: "iron-heart",
    name: "철의 심장",
    description: "차가운 금속 안에서 작은 심장 박동이 느껴진다.",
    icon: "/assets/pixel-art/rpg/adventure/relics/iron-heart.png",
  },
  {
    id: "moon-mirror",
    name: "달빛 거울",
    description: "설원의 달빛과 적의 움직임을 함께 비춘다.",
    icon: "/assets/pixel-art/rpg/adventure/relics/moon-mirror.png",
  },
  {
    id: "phoenix-feather",
    name: "불사조의 깃털",
    description: "꺼지지 않는 온기가 남아 있는 붉은 깃털.",
    icon: "/assets/pixel-art/rpg/adventure/relics/phoenix-feather.png",
  },
  {
    id: "sun-chalice",
    name: "태양의 성배",
    description: "동굴 깊은 곳에서도 금빛으로 빛나는 성배.",
    icon: "/assets/pixel-art/rpg/adventure/relics/sun-chalice.png",
  },
  {
    id: "war-drum",
    name: "전쟁의 북",
    description: "전투가 격렬해질수록 더 크게 울리는 작은 북.",
    icon: "/assets/pixel-art/rpg/adventure/relics/war-drum.png",
  },
  {
    id: "wind-boots",
    name: "바람 장화",
    description: "대쉬의 흔적을 가볍게 만드는 고대 장화.",
    icon: "/assets/pixel-art/rpg/adventure/relics/wind-boots.png",
  },
  {
    id: "wolf-eye",
    name: "설원 늑대의 눈",
    description: "눈보라 속에서도 사냥감의 흔적을 놓치지 않는다.",
    icon: "/assets/pixel-art/rpg/adventure/relics/wolf-eye.png",
  },
] as const;

export type RpgRelicId = (typeof RPG_RELICS)[number]["id"];

export function getRpgRelic(id: RpgRelicId) {
  return RPG_RELICS.find((relic) => relic.id === id);
}
