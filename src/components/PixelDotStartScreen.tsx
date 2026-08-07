"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { primeRpgAudioContext } from "@/lib/rpgAudio";
import { useGameStore } from "@/stores/gameStore";

const TITLE_MUSIC_PATH = "/assets/audio/title/hero-morning.mp3";
const TITLE_MUSIC_VOLUME = 0.42;

export function PixelDotStartScreen() {
  const setActiveView = useGameStore((state) => state.setActiveView);
  const hasStartedRef = useRef(false);
  const titleMusicRef = useRef<HTMLAudioElement>(null);

  const playTitleMusic = useCallback(() => {
    const music = titleMusicRef.current;
    if (!music) {
      return;
    }

    music.volume = TITLE_MUSIC_VOLUME;
    void music.play().catch(() => undefined);
  }, []);

  const startGame = useCallback(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const titleMusic = titleMusicRef.current;
    if (titleMusic) {
      titleMusic.pause();
      titleMusic.currentTime = 0;
    }
    primeRpgAudioContext();
    setActiveView("rpg");
  }, [setActiveView]);

  useEffect(() => {
    const titleMusic = titleMusicRef.current;
    if (!titleMusic) {
      return;
    }

    titleMusic.volume = TITLE_MUSIC_VOLUME;
    playTitleMusic();
    window.addEventListener("pointerdown", playTitleMusic, { once: true });

    return () => {
      window.removeEventListener("pointerdown", playTitleMusic);
      titleMusic.pause();
      titleMusic.currentTime = 0;
    };
  }, [playTitleMusic]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing) {
        return;
      }

      startGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startGame]);

  return (
    <section
      aria-label="Pixel Dot Land 시작 화면"
      className="pixel-dot-start-screen"
    >
      <audio
        aria-hidden="true"
        autoPlay
        loop
        preload="auto"
        ref={titleMusicRef}
        src={TITLE_MUSIC_PATH}
      />
      <Image
        alt=""
        className="pixel-dot-start-background"
        fill
        priority
        sizes="100vw"
        src="/assets/branding/pixel-dot-land-start-background.png"
      />
      <div aria-hidden="true" className="pixel-dot-start-vignette" />
      <div aria-hidden="true" className="pixel-dot-floating-logo">
        <Image
          alt=""
          fill
          priority
          sizes="100vw"
          src="/assets/branding/pixel-dot-land-title-logo.png"
        />
      </div>
      <h1 className="sr-only">Pixel Dot Land</h1>
      <button
        autoFocus
        className="pixel-dot-start-prompt"
        onClick={startGame}
        type="button"
      >
        Start to press any key.
      </button>
    </section>
  );
}
