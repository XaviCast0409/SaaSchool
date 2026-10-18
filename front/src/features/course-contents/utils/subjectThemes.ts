import React from 'react';
import {
  Calculator,
  BookOpen,
  FlaskConical,
  Globe,
  Languages,
  Palette,
  Dumbbell,
  Laptop,
  HeartHandshake,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export interface SubjectTheme {
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  badgeStyle: string;
  cardAccent: string;
}

export const getSubjectTheme = (areaName: string = ''): SubjectTheme => {
  const normalized = areaName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('matemat') || normalized.includes('algeb') || normalized.includes('geom') || normalized.includes('aritmet')) {
    return {
      icon: Calculator,
      category: 'Ciencias Exactas',
      badgeStyle: 'bg-primary/10 text-primary border-primary/20',
      cardAccent: 'group-hover:border-primary/40',
    };
  }

  if (normalized.includes('comunic') || normalized.includes('lengu') || normalized.includes('literat') || normalized.includes('lectur')) {
    return {
      icon: BookOpen,
      category: 'Lenguaje y Letras',
      badgeStyle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      cardAccent: 'group-hover:border-emerald-500/40',
    };
  }

  if (normalized.includes('cienc') || normalized.includes('fisic') || normalized.includes('quimic') || normalized.includes('biol') || normalized.includes('ambient')) {
    return {
      icon: FlaskConical,
      category: 'Ciencia y Tecnología',
      badgeStyle: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
      cardAccent: 'group-hover:border-cyan-500/40',
    };
  }

  if (normalized.includes('social') || normalized.includes('histor') || normalized.includes('geograf') || normalized.includes('econom')) {
    return {
      icon: Globe,
      category: 'Ciencias Sociales',
      badgeStyle: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      cardAccent: 'group-hover:border-amber-500/40',
    };
  }

  if (normalized.includes('ingles') || normalized.includes('english') || normalized.includes('extranjer') || normalized.includes('idiom')) {
    return {
      icon: Languages,
      category: 'Idiomas Extranjeros',
      badgeStyle: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
      cardAccent: 'group-hover:border-violet-500/40',
    };
  }

  if (normalized.includes('arte') || normalized.includes('cultur') || normalized.includes('music') || normalized.includes('teatr') || normalized.includes('danz')) {
    return {
      icon: Palette,
      category: 'Arte y Cultura',
      badgeStyle: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
      cardAccent: 'group-hover:border-pink-500/40',
    };
  }

  if (normalized.includes('educacion fisic') || normalized.includes('deport') || normalized.includes('psicomotr')) {
    return {
      icon: Dumbbell,
      category: 'Salud y Deporte',
      badgeStyle: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
      cardAccent: 'group-hover:border-orange-500/40',
    };
  }

  if (normalized.includes('comput') || normalized.includes('informa') || normalized.includes('robotic') || normalized.includes('tecnol') || normalized.includes('trabaj')) {
    return {
      icon: Laptop,
      category: 'Tecnología y Trabajo',
      badgeStyle: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
      cardAccent: 'group-hover:border-indigo-500/40',
    };
  }

  if (normalized.includes('personal') || normalized.includes('civic') || normalized.includes('ciudadan') || normalized.includes('dpcc') || normalized.includes('tutor')) {
    return {
      icon: HeartHandshake,
      category: 'Desarrollo Personal',
      badgeStyle: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
      cardAccent: 'group-hover:border-teal-500/40',
    };
  }

  if (normalized.includes('relig') || normalized.includes('pastor') || normalized.includes('espirit')) {
    return {
      icon: Sparkles,
      category: 'Educación Religiosa',
      badgeStyle: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      cardAccent: 'group-hover:border-purple-500/40',
    };
  }

  return {
    icon: GraduationCap,
    category: 'Formación Académica',
    badgeStyle: 'bg-secondary text-secondary-foreground border-border',
    cardAccent: 'group-hover:border-primary/30',
  };
};
