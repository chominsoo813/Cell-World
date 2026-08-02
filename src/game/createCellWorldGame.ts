import * as Phaser from "phaser";
import { CellWorldRpgScene } from "@/game/scenes/CellWorldRpgScene";
import { CellOfficeDefenceScene } from "@/game/scenes/CellOfficeDefenceScene";
import { CellOfficeRefScene } from "@/game/scenes/CellOfficeRefScene";
import type { GameId } from "@/lib/gameCatalog";

const scenes = {
  defence: CellOfficeDefenceScene,
  keeper: CellOfficeRefScene,
  rpg: CellWorldRpgScene,
} as const;

export function createCellWorldGame(parent: HTMLElement, gameId: GameId) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#31562f",
    pixelArt: true,
    antialias: false,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    scene: [scenes[gameId]],
  });
}
