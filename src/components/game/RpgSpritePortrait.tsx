"use client";

import type { CSSProperties } from "react";
import { getRpgClass, isRpgClassId } from "@/lib/rpgClasses";

const LEGACY_PORTRAIT_URLS: Record<string, string> = {
  "rpg-character-adventurer-front":
    "/assets/pixel-art/rpg/adventure/characters/adventurer-preview.png",
  "rpg-chest": "/assets/pixel-art/rpg/chest.png",
  "rpg-elder": "/assets/pixel-art/rpg/elder_front.png",
  "rpg-house": "/assets/pixel-art/rpg/house.png",
  "rpg-knight": "/assets/pixel-art/rpg/knight_front.png",
  "rpg-market": "/assets/pixel-art/rpg/market.png",
  "rpg-merchant": "/assets/pixel-art/rpg/merchant_front.png",
  "rpg-potion": "/assets/pixel-art/rpg/potion.png",
  "rpg-questRelic": "/assets/pixel-art/rpg/quest_relic.png",
  "rpg-ruins": "/assets/pixel-art/rpg/ruins.png",
  "rpg-sign": "/assets/pixel-art/rpg/sign.png",
  "rpg-villager": "/assets/pixel-art/rpg/villager_front.png",
};

interface RpgSpritePortraitProps {
  className?: string;
  frame?: number;
  label?: string;
  portrait?: string;
}

export function RpgSpritePortrait({
  className = "",
  frame = 0,
  label,
  portrait,
}: RpgSpritePortraitProps) {
  const characterPrefix = "rpg-character-";
  const possibleClassId = portrait?.startsWith(characterPrefix)
    ? portrait.slice(characterPrefix.length)
    : undefined;
  const classId = isRpgClassId(possibleClassId)
    ? possibleClassId
    : undefined;
  const normalizedFrame = Math.max(0, Math.min(63, Math.floor(frame)));
  const column = normalizedFrame % 8;
  const row = Math.floor(normalizedFrame / 8);
  const backgroundPosition = `${(column / 7) * 100}% ${(row / 7) * 100}%`;
  const backgroundImage = classId
    ? `url("${getRpgClass(classId).spriteFile}")`
    : `url("${
        LEGACY_PORTRAIT_URLS[portrait ?? ""] ??
        LEGACY_PORTRAIT_URLS["rpg-villager"]
      }")`;
  const style = {
    backgroundImage,
    backgroundPosition: classId ? backgroundPosition : "center",
    backgroundSize: classId ? "800% 800%" : "contain",
  } as CSSProperties;

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`rpg-sprite-portrait ${
        classId ? "is-character" : "is-static"
      } ${className}`.trim()}
      role={label ? "img" : undefined}
      style={style}
    />
  );
}
