import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/npc/chat/route";

function createRequest(
  body: unknown,
  address = `test-${crypto.randomUUID()}`,
) {
  return new Request("http://localhost/api/npc/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": address,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  npcId: "elder_nora",
  message: "지금 무엇을 해야 해?",
  gameState: {
    currentMap: "village_01",
    playerLevel: 1,
    hp: 60,
    hasPotion: false,
    questStatus: "meet_elder",
    memory: null,
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/npc/chat", () => {
  it("rejects an unknown NPC", async () => {
    const response = await POST(
      createRequest({ ...validBody, npcId: "prompt_injector" }),
    );

    expect(response.status).toBe(400);
  });

  it("returns the local fallback without storing the question", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST(createRequest(validBody));
    const payload = (await response.json()) as {
      memory: { questStatus: string; recentTopic: string };
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("fallback");
    expect(payload.memory).toEqual({
      questStatus: "meet_elder",
      recentTopic: "general",
    });
    expect(JSON.stringify(payload.memory)).not.toContain(validBody.message);
  });

  it("rejects request bodies larger than 4KB", async () => {
    const response = await POST(
      createRequest({ ...validBody, message: "a".repeat(5_000) }),
    );

    expect(response.status).toBe(413);
  });

  it("returns 429 after the per-client request limit", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const address = `rate-${crypto.randomUUID()}`;
    let response = await POST(createRequest(validBody, address));

    for (let index = 1; index < 13; index += 1) {
      response = await POST(createRequest(validBody, address));
    }

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });
});
