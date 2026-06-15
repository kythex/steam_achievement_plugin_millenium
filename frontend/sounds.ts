import { AchievementData } from './types';

/**
 * Synthesizes an Xbox 360-inspired achievement unlock sound using the Web Audio API.
 * No external audio file required.
 *
 * The original Xbox 360 sound is a rising orchestral "ding" — a bright major chord
 * that swells and fades. We approximate it with layered sine oscillators.
 */
export function playAchievementSound(volume = 0.7): void {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume * 0.4, ctx.currentTime + 0.05);
    master.gain.setValueAtTime(volume * 0.4, ctx.currentTime + 0.6);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    master.connect(ctx.destination);

    // Layer 1: Low "thunk" transient
    createOscillator(ctx, master, 'sine', 220, 330, 0, 0.08, 0.25);

    // Layer 2: Mid rising tone (main melody note)
    createOscillator(ctx, master, 'sine', 523, 784, 0.05, 0.7, 0.5);

    // Layer 3: High sparkle (overtone)
    createOscillator(ctx, master, 'triangle', 1047, 1568, 0.1, 1.0, 0.35);

    // Layer 4: Sustain note (harmonic richness)
    createOscillator(ctx, master, 'sine', 659, 988, 0.15, 1.5, 0.3);

    // Gentle reverb via a delayed copy
    const delay = ctx.createDelay(0.3);
    delay.delayTime.value = 0.18;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.15;
    master.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    // Clean up after sound finishes
    setTimeout(() => ctx.close(), 3000);
  } catch (e) {
    console.warn('[xbox360-achievements] Could not play sound:', e);
  }
}

function createOscillator(
  ctx: AudioContext,
  destination: AudioNode,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  startOffset: number,
  stopOffset: number,
  gainLevel: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime + startOffset);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + startOffset + stopOffset * 0.6);

  gain.gain.setValueAtTime(gainLevel, ctx.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + stopOffset);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + stopOffset + 0.1);
}

export function playTestSound(volume = 0.7): void {
  playAchievementSound(volume);
}

/** Creates a mock achievement for settings preview / testing */
export function makeMockAchievement(): AchievementData {
  return {
    strID: 'test_achievement',
    strName: 'Master of Achievements',
    strDescription: 'You have unlocked the ultimate test achievement!',
    nGamerScore: 50,
    flAchieved: 12.5,
    nAppID: 0,
    strAppName: 'Test Game',
    bHidden: false,
  };
}
