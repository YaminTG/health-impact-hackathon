import { NavLink, Link, useNavigate } from 'react-router-dom';
import { House, ScanLine, HeartPulse, Info, Settings, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

export function TopBar({ title, back }) {
  const { t, toggle, dir } = useI18n();
  const navigate = useNavigate();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  return (
    <header className="topbar">
      <div className="topbar-start">
        {back ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
            <BackIcon size={24} />
          </button>
        ) : (
          <Link to="/" className="brand" aria-label={t('app.name')}>
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <span>{t('app.name')}</span>
          </Link>
        )}
        {title && back && <h1 className="topbar-title">{title}</h1>}
      </div>
      <div className="topbar-end">
        <button className="lang-btn" onClick={toggle} aria-label="Language">
          {t('lang.toggle')}
        </button>
        <Link to="/settings" className="icon-btn" aria-label={t('nav.settings')}>
          <Settings size={22} />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const items = [
    { to: '/', icon: House, label: t('nav.home'), end: true },
    { to: '/scan', icon: ScanLine, label: t('nav.scan') },
    { to: '/places', icon: UtensilsCrossed, label: t('nav.places') },
    { to: '/gut-score', icon: HeartPulse, label: t('nav.gut') },
    { to: '/about', icon: Info, label: t('nav.about') },
  ];
  return (
    <nav className="bottomnav">
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Page({ title, back, children, nav = true }) {
  return (
    <div className={`app${nav ? ' has-nav' : ''}`}>
      <TopBar title={title} back={back} />
      <main className="content">{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
