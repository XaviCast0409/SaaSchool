import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-muted/40 p-1', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === item.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-300">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
