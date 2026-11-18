import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playFeedbackTone } from '../audioFeedback';

describe('playFeedbackTone', () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;

  beforeEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  });

  afterEach(() => {
    (window as unknown as { AudioContext?: unknown }).AudioContext = originalAudioContext;
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = originalWebkitAudioContext;
    vi.restoreAllMocks();
  });

  it('does not throw when AudioContext is unavailable', () => {
    expect(() => playFeedbackTone('success')).not.toThrow();
  });

  it('configures oscillator and gain for confirm tone', () => {
    const osc = {
      type: 'custom',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };

    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const closeMock = vi.fn();
    const destination = {};

    const FakeAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination,
      close: closeMock,
      createOscillator: () => osc,
      createGain: () => gain,
    }));

    (window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext;

    playFeedbackTone('confirm');

    expect(FakeAudioContext).toHaveBeenCalledTimes(1);
    expect(osc.type).toBe('sine');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.15, 0);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.35);
    expect(osc.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(destination);
    expect(osc.start).toHaveBeenCalledTimes(1);
    expect(osc.stop).toHaveBeenCalledWith(0.35);

    // Verify cleanup on ended
    expect(typeof osc.onended).toBe('function');
    osc.onended?.();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('configures oscillator and gain for success tone', () => {
    const osc = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };

    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const closeMock = vi.fn();
    const FakeAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 10,
      destination: {},
      close: closeMock,
      createOscillator: () => osc,
      createGain: () => gain,
    }));

    (window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext;

    playFeedbackTone('success');

    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.15, 10);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.01, 10 + 0.15);
    expect(osc.start).toHaveBeenCalledTimes(1);
    expect(osc.stop).toHaveBeenCalledWith(10 + 0.15);
  });

  it('configures oscillator and gain for warning and error tones', () => {
    const osc = {
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };

    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const FakeAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      close: vi.fn(),
      createOscillator: () => osc,
      createGain: () => gain,
    }));

    (window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext;

    playFeedbackTone('warning');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.15, 0);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.01, 0.25);

    playFeedbackTone('error');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 0);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.01, 0.3);
  });
});
