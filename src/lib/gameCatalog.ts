export const gameCatalog = [
  {
    id: "rpg",
    order: "01",
    title: "Cell World RPG",
    label: "MAIN WORLD",
    description: "셀과 셀 사이를 탐험하는 도트 오픈월드 RPG",
    status: "PLAYABLE",
    sheetName: "RPG Map",
    accent: "#f7c948",
  },
  {
    id: "keeper",
    order: "02",
    title: "Cell Office Keeper",
    label: "OFFICE ESCAPE",
    description: "업무 파일을 회수하고 제한 시간 안에 탈출하는 잠입 퍼즐",
    status: "PLAYABLE",
    sheetName: "Office",
    accent: "#64d8cb",
  },
  {
    id: "defence",
    order: "03",
    title: "Cell Office Defence",
    label: "SURVIVOR MODE",
    description: "사무실 몬스터에 맞서 빌드를 완성하는 생존 액션",
    status: "PLAYABLE",
    sheetName: "Defence",
    accent: "#ff7c76",
  },
] as const;

export type GameId = (typeof gameCatalog)[number]["id"];

export function getGameById(id: GameId) {
  return gameCatalog.find((game) => game.id === id) ?? gameCatalog[0];
}
