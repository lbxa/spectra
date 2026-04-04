export type ExtensionSoundFile = "click.wav" | "jingle.wav" | "error.wav";

export async function playExtensionSound(fileName: ExtensionSoundFile): Promise<void> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== "function") {
    return;
  }

  try {
    const audio = new Audio(runtime.getURL(`audio/${fileName}`));
    audio.volume = 0.5;
    await audio.play();
  } catch {
    // Ignore blocked autoplay and missing codec failures.
  }
}
