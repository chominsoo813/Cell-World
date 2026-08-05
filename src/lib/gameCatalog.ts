export const gameCatalog = [
  {
    id: "rpg",
    order: "01",
    title: "Pixel Dot Land",
    label: "PIXEL FANTASY RPG",
    description: "마을과 고대 던전, 설원을 탐험하는 픽셀 판타지 RPG",
    status: "PLAYABLE",
    sheetName: "World Map",
    accent: "#f7c948",
  },
] as const;

export type PlayableGameId = (typeof gameCatalog)[number]["id"];
export type GameId = PlayableGameId | "keeper" | "defence";

export function isPlayableGameId(id: GameId): id is PlayableGameId {
  return gameCatalog.some((game) => game.id === id);
}

export function getGameById(id: GameId) {
  return gameCatalog.find((game) => game.id === id) ?? gameCatalog[0];
}
