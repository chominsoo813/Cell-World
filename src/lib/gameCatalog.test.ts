import { describe, expect, it } from "vitest";
import {
  gameCatalog,
  getGameById,
  isPlayableGameId,
} from "@/lib/gameCatalog";

describe("game catalog", () => {
  it("exposes only Pixel Dot Land as a playable game", () => {
    expect(gameCatalog.map((game) => game.id)).toEqual(["rpg"]);
    expect(isPlayableGameId("rpg")).toBe(true);
    expect(isPlayableGameId("keeper")).toBe(false);
    expect(isPlayableGameId("defence")).toBe(false);
  });

  it("falls back to Pixel Dot Land for retired game ids", () => {
    expect(getGameById("keeper").id).toBe("rpg");
    expect(getGameById("defence").id).toBe("rpg");
  });
});
