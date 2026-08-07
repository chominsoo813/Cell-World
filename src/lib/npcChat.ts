export const NPC_IDS = ["elder_nora"] as const;

export const NPC_QUEST_STATUSES = [
  "meet_elder",
  "collect_relic",
  "defeat_slimes",
  "return_elder",
  "complete",
  "talk_lumi",
  "open_village_chest",
  "talk_rowan",
  "explore_dungeons",
  "find_digger",
  "altar_challenge",
] as const;

export const NPC_TOPICS = [
  "combat",
  "forest",
  "general",
  "healing",
  "quest",
  "ruins",
] as const;

export type NpcId = (typeof NPC_IDS)[number];
export type NpcQuestStatus = (typeof NPC_QUEST_STATUSES)[number];
export type NpcTopic = (typeof NPC_TOPICS)[number];

export interface NpcMemory {
  questStatus: NpcQuestStatus;
  recentTopic: NpcTopic;
}

export function inferNpcTopic(message: string): NpcTopic {
  if (/퀘스트|임무|의뢰|목표|quest/i.test(message)) {
    return "quest";
  }
  if (/폐허|코어|수식|relic|ruins?/i.test(message)) {
    return "ruins";
  }
  if (/숲|북쪽|forest/i.test(message)) {
    return "forest";
  }
  if (/회복|물약|체력|hp|heal|potion/i.test(message)) {
    return "healing";
  }
  if (/공격|전투|몬스터|슬라임|고블린|battle|fight/i.test(message)) {
    return "combat";
  }
  return "general";
}
