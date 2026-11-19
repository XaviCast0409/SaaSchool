import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { AUTO_ADVANCE_MS, FEATURES } from '../constants/marketingFeatures';

/** Funciones principales en pestañas que avanzan solas, cada una con su vista de ejemplo. */
export const FeatureTabs: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % FEATURES.length), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, paused]);

  const feature = FEATURES[activeIndex]!;
  const Visual = feature.visual;

  return (
    <section id="funciones" className="py-24 sm:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl kx-reveal">
          <span className="kx-eyebrow">Todo en un solo lugar</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            Seis problemas de siempre, <span className="kx-serif kx-grad-text">resueltos</span> en una plataforma.
          </h2>
        </div>

        <div
          className="mt-12 grid lg:grid-cols-[300px_1fr] gap-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-5 px-5 lg:mx-0 lg:px-0 kx-reveal"
            role="tablist"
          >
            {FEATURES.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveIndex(index)}
                  className={`kx-tab shrink-0 text-left px-4 py-3.5 ${isActive ? 'is-active' : ''}`}
                >
                  <span className="flex items-center gap-3 font-bold">
                    <Icon className="w-5 h-5" /> {item.label}
                  </span>
                  {isActive && (
                    <span className="kx-tab-progress mt-3 hidden lg:block">
                      <span
                        key={`${activeIndex}-${paused}`}
                        style={{
                          animationDuration: `${AUTO_ADVANCE_MS}ms`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            key={feature.id}
            className="kx-panel-enter rounded-[28px] bg-white border border-[var(--kx-line)] p-6 sm:p-10 grid gap-8"
          >
            <div className="lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-10 lg:items-end">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">{feature.title}</h3>
                <p className="mt-4 kx-muted text-base sm:text-lg leading-relaxed">{feature.text}</p>
              </div>
              <ul className="mt-6 lg:mt-0 space-y-3">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 font-semibold">
                    <span
                      className="w-6 h-6 rounded-full grid place-items-center"
                      style={{ background: 'rgba(239,122,76,.14)', color: 'var(--kx-coral)' }}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
