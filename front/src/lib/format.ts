export interface FormatMoneyOptions {
  decimals?: number;
  symbol?: boolean;
}

export function formatMoney(amount: number | string | null | undefined, options?: FormatMoneyOptions): string {
  const parsed = typeof amount === 'number' ? amount : Number(amount);
  const value = Number.isFinite(parsed) ? parsed : 0;
  const decimals = options?.decimals ?? 2;
  const symbol = options?.symbol ?? true;

  const formatted = value.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return symbol ? `S/ ${formatted}` : formatted;
}
