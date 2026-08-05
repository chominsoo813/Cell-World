import * as Phaser from "phaser";
import { CellWorldRpgScene } from "@/game/scenes/CellWorldRpgScene";
import type { GameId } from "@/lib/gameCatalog";
import {
  getRpgAudioContext,
  getRpgPhaserAudioConfig,
} from "@/lib/rpgAudio";

export function createCellWorldGame(parent: HTMLElement, gameId: GameId) {
  if (gameId !== "rpg") {
    throw new Error(`Retired game mode cannot be started: ${gameId}`);
  }

  const audioContext = getRpgAudioContext();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#31562f",
    pixelArt: true,
    antialias: false,
    ...getRpgPhaserAudioConfig(audioContext),
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
    scene: [CellWorldRpgScene],
  });
}
