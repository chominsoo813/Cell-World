import { describe, expect, it } from "vitest";
import { getRpgPhaserAudioConfig } from "@/lib/rpgAudio";

describe("RPG Phaser audio configuration", () => {
  it("omits the audio property when no RPG audio context exists", () => {
    expect(getRpgPhaserAudioConfig()).toEqual({});
    expect(getRpgPhaserAudioConfig()).not.toHaveProperty("audio");
  });

  it("passes an available RPG audio context to Phaser", () => {
    const audioContext = {} as AudioContext;

    expect(getRpgPhaserAudioConfig(audioContext)).toEqual({
      audio: { context: audioContext },
    });
  });
});
