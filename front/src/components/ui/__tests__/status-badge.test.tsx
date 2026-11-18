import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  afterEach(cleanup);

  it('renders children with tone classes', () => {
    render(<StatusBadge tone="danger">Falta</StatusBadge>);
    const badge = screen.getByText('Falta');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('text-red-700');
  });

  it('applies custom className alongside tone classes', () => {
    render(
      <StatusBadge tone="success" className="custom-extra-class">
        Presente
      </StatusBadge>,
    );
    const badge = screen.getByText('Presente');
    expect(badge.className).toContain('text-emerald-700');
    expect(badge.className).toContain('custom-extra-class');
  });
});
