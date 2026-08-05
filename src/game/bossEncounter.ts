export function getRpgBossDefeatKey(mapId: string, bossKind: string) {
  return `${mapId}:${bossKind}`;
}

export function resetRpgBossEncounter<TMapId extends string>(
  mapId: TMapId,
  bossKinds: readonly string[],
  defeatedBossMaps: Set<TMapId>,
  defeatedBossKinds: Set<string>,
) {
  defeatedBossMaps.delete(mapId);
  for (const bossKind of bossKinds) {
    defeatedBossKinds.delete(getRpgBossDefeatKey(mapId, bossKind));
  }
}
