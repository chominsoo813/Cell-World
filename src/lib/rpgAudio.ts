let sharedRpgAudioContext: AudioContext | undefined;

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (
    window.AudioContext ??
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext
  );
}

export function primeRpgAudioContext() {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return;
  }

  if (!sharedRpgAudioContext || sharedRpgAudioContext.state === "closed") {
    sharedRpgAudioContext = new AudioContextConstructor();
  }
  if (sharedRpgAudioContext.state === "suspended") {
    void sharedRpgAudioContext.resume().catch(() => undefined);
  }
}

export function getRpgAudioContext() {
  return sharedRpgAudioContext?.state === "closed"
    ? undefined
    : sharedRpgAudioContext;
}

export function getRpgPhaserAudioConfig(audioContext?: AudioContext) {
  return audioContext
    ? { audio: { context: audioContext } }
    : {};
}
