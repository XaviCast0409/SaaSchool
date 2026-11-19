import React from 'react';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Flag,
  PartyPopper,
  UserRound,
} from 'lucide-react';
import type { CalendarItem } from '../../api/useCalendar';

export const KindIcon: React.FC<{ item: CalendarItem; className?: string }> = ({ item, className }) => {
  const Icon =
    item.kind === 'PERIOD'
      ? Flag
      : item.kind === 'HOLIDAY'
        ? PartyPopper
        : item.kind === 'HOMEWORK'
          ? BookOpen
          : item.kind === 'MEETING'
            ? UserRound
            : item.kind === 'PAYMENT'
              ? CreditCard
              : CalendarDays;
  return <Icon className={className} aria-hidden />;
};
