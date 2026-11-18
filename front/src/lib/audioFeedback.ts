export type FeedbackTone = 'success' | 'warning' | 'error' | 'confirm';

interface ToneConfig {
  freq: number;
  initialGain: number;
  finalGain: number;
  duration: number;
  oscType?: OscillatorType;
}

const TONES: Record<FeedbackTone, ToneConfig> = {
  success: { freq: 880, initialGain: 0.15, finalGain: 0.01, duration: 0.15 },
  warning: { freq: 440, initialGain: 0.15, finalGain: 0.01, duration: 0.25 },
  error: { freq: 220, initialGain: 0.2, finalGain: 0.01, duration: 0.3 },
  confirm: { freq: 880, initialGain: 0.15, finalGain: 0.001, duration: 0.35, oscType: 'sine' },
};

export function playFeedbackTone(type: FeedbackTone): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const config = TONES[type];
    if (!config) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (config.oscType) {
      osc.type = config.oscType;
    }

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(config.freq, now);
    gain.gain.setValueAtTime(config.initialGain, now);
    gain.gain.exponentialRampToValueAtTime(config.finalGain, now + config.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + config.duration);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Si el navegador bloquea audio, continuar silenciosamente
  }
}
