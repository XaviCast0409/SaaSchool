import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, MessageCircle, X } from 'lucide-react';
import logoDark from '@/assets/brand/kipux-logo-dark.png';
import logoLight from '@/assets/brand/kipux-logo-light.png';
import { useAuthStore } from '@/store/useAuthStore';
import '../landing.css';
import { LeadModalProvider, useLeadModal } from '../components/LeadModal';
import { HeroSection } from '../components/HeroSection';
import { FeatureTabs } from '../components/FeatureTabs';
import { BeforeAfter, DayTimeline, FeatureMarquee } from '../components/StorySections';
import { FaqSection, FinalCta, PricingSection, RoiCalculator, RolesSection } from '../components/ConversionSections';
import { DEFAULT_WHATSAPP_TEXT, useRevealOnScroll, whatsappUrl } from '../lib/marketing';

const NAV_LINKS = [
  { href: '#funciones', label: 'Funciones' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#precios', label: 'Precios' },
  { href: '#preguntas', label: 'Preguntas' },
];

const Header: React.FC = () => {
  const { openLead } = useLeadModal();
  const token = useAuthStore((state) => state.token);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header className={`kx-header fixed top-0 inset-x-0 z-50 ${solid ? 'is-scrolled' : ''}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center gap-8">
        <a href="#inicio" className="shrink-0" aria-label="KIPUX, ir al inicio">
          <img src={solid ? logoLight : logoDark} alt="KIPUX · Revolución educativa" className="h-9 sm:h-10 w-auto" />
        </a>
        <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="px-4 py-2 rounded-full opacity-75 hover:opacity-100 transition-opacity">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to={token ? '/dashboard' : '/login'} className="hidden sm:inline-flex px-4 py-2 text-sm font-bold opacity-85 hover:opacity-100">
            {token ? 'Ir a mi panel' : 'Ingresar'}
          </Link>
          <button onClick={() => openLead('cabecera')} className="kx-btn kx-btn-primary px-5 py-2.5 text-sm">
            Pedir demo <ArrowRight className="w-4 h-4 hidden sm:block" />
          </button>
          <button className="lg:hidden w-10 h-10 grid place-items-center rounded-full" onClick={() => setMenuOpen((open) => !open)} aria-label="Menú" aria-expanded={menuOpen}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="lg:hidden border-t border-[var(--kx-line)] px-5 pb-6 pt-2 kx-panel-enter">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-3.5 text-lg font-bold border-b border-[var(--kx-line)]">
              {link.label}
            </a>
          ))}
          <Link to={token ? '/dashboard' : '/login'} className="block py-3.5 text-lg font-bold">
            {token ? 'Ir a mi panel' : 'Ingresar a la plataforma'}
          </Link>
        </nav>
      )}
    </header>
  );
};

const Footer: React.FC = () => (
  <footer className="kx-section-dark border-t border-white/10">
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid md:grid-cols-[1.4fr_1fr_1fr] gap-10">
      <div>
        <img src={logoDark} alt="KIPUX · Revolución educativa" className="h-11 w-auto" />
        <p className="mt-5 kx-on-dark max-w-sm leading-relaxed">Gestión escolar para colegios del Perú: matrícula, asistencia, notas, pensiones y familias en un solo lugar.</p>
      </div>
      <div>
        <p className="font-extrabold">Producto</p>
        <ul className="mt-4 space-y-2.5 kx-on-dark text-sm">
          {NAV_LINKS.map((link) => <li key={link.href}><a href={link.href} className="hover:text-white">{link.label}</a></li>)}
        </ul>
      </div>
      <div>
        <p className="font-extrabold">Contacto</p>
        <ul className="mt-4 space-y-2.5 kx-on-dark text-sm">
          <li><a href={whatsappUrl(DEFAULT_WHATSAPP_TEXT)} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp: 949 771 996</a></li>
          <li><Link to="/login" className="hover:text-white">Ingresar a la plataforma</Link></li>
          <li><Link to="/privacidad" className="hover:text-white">Política de privacidad</Link></li>
          <li><Link to="/terminos" className="hover:text-white">Términos y condiciones</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10 py-6 text-center text-xs text-[var(--kx-on-dark-2)]">
      © {new Date().getFullYear()} KIPUX · Revolución educativa
    </div>
  </footer>
);

/** Botones fijos: WhatsApp flotante y, en celulares, una barra para pedir la demostración. */
const FloatingActions: React.FC = () => {
  const { openLead } = useLeadModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a
        href={whatsappUrl(DEFAULT_WHATSAPP_TEXT)}
        target="_blank"
        rel="noreferrer"
        className={`kx-wa fixed right-5 z-40 w-14 h-14 rounded-full grid place-items-center transition-all duration-300 bottom-24 sm:bottom-6 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
        aria-label="Escríbenos por WhatsApp"
      >
        <MessageCircle className="w-7 h-7 relative" />
      </a>
      <div className={`sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[rgba(251,248,243,.92)] backdrop-blur border-t border-[var(--kx-line)] transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <button onClick={() => openLead('barra-movil')} className="kx-btn kx-btn-primary w-full py-3.5">
          Solicitar demostración <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};

const ReadingProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="kx-progress-bar" style={{ width: `${progress * 100}%` }} />;
};

const LandingContent: React.FC = () => {
  useRevealOnScroll();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'KIPUX | Gestión escolar para colegios del Perú';
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => {
      document.title = previousTitle;
      html.style.scrollBehavior = previousBehavior;
    };
  }, []);

  return (
    <div className="kx min-h-screen" id="inicio">
      <ReadingProgress />
      <Header />
      <main>
        <HeroSection />
        <FeatureMarquee />
        <FeatureTabs />
        <BeforeAfter />
        <DayTimeline />
        <RolesSection />
        <RoiCalculator />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
      <FloatingActions />
    </div>
  );
};

/** Web de marketing de KIPUX (página pública de inicio). */
export const LandingPage: React.FC = () => (
  <LeadModalProvider>
    <LandingContent />
  </LeadModalProvider>
);
