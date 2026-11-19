import React from 'react';

const quickActionClass =
  'flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-foreground transition-all shadow-sm group';

export interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  hover: string;
  iconTone: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  hover,
  iconTone,
}) => (
  <button onClick={onClick} className={`${quickActionClass} ${hover}`}>
    <div className={`p-2.5 rounded-lg transition-colors ${iconTone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-left">
      <span className="block font-bold text-sm leading-tight">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  </button>
);

export const QuickAction = QuickActionCard;
