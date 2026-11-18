import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from '../download';

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn();
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates an anchor, triggers download and revokes URL after 1000ms', () => {
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    let capturedDownload = '';
    let capturedHref = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedDownload = this.download;
      capturedHref = this.href;
    });

    const blob = new Blob(['test content'], { type: 'text/plain' });
    downloadBlob(blob, 'a.xlsx');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(capturedDownload).toBe('a.xlsx');
    expect(capturedHref).toBe('blob:x');

    // Anchor should already be removed from the document body
    expect(document.querySelector('a[download]')).toBeNull();

    // Revoke should not have been called immediately
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    // Advance 1000ms
    vi.advanceTimersByTime(1000);

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:x');
  });
});
