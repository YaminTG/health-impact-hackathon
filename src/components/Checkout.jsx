import { useState } from 'react';
import { Truck, ShoppingBag, House, Building2, Clock } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { getProfile } from '../lib/storage.js';
import dashboard from '../data/dashboard.json';

export const AREAS = dashboard.scansByArea;
export const SLOTS = ['asap', 'lunch1', 'lunch2', 'evening'];

/** Shared checkout state for the Order and Basket screens. */
export function useCheckout() {
  const profileArea = getProfile()?.area;
  return useState(() => ({
    method: 'delivery', // 'delivery' | 'pickup'
    dest: 'home', // 'home' | 'park'
    area: AREAS.some((a) => a.en === profileArea) ? profileArea : AREAS[0].en,
    address: '',
    building: '',
    office: '',
    slot: 'asap',
    note: '',
  }));
}

/** What gets saved with the order. */
export function checkoutDetails(c) {
  const delivery = c.method === 'delivery';
  return {
    method: c.method,
    dest: delivery ? c.dest : null,
    area: delivery && c.dest === 'home' ? c.area : delivery ? 'King Hussein Business Park' : null,
    address: delivery && c.dest === 'home' ? c.address.trim() : null,
    building: delivery && c.dest === 'park' ? c.building.trim() : null,
    office: delivery && c.dest === 'park' ? c.office.trim() : null,
    slot: c.slot,
    note: c.note.trim() || null,
  };
}

/** Short "where & when" line for summaries and confirmations. */
export function whereWhen(c, t, pick) {
  const when = t(`slot.${c.slot}`);
  if (c.method === 'pickup') return `${t('order.pickup')} · ${when}`;
  if (c.dest === 'park') {
    const bits = [t('dest.park'), c.building && t('dest.buildingN', { n: c.building }), c.office].filter(Boolean);
    return `${bits.join(' · ')} · ${when}`;
  }
  const area = AREAS.find((a) => a.en === c.area);
  return `${[area ? pick(area) : c.area, c.address].filter(Boolean).join(' · ')} · ${when}`;
}

function Choice({ on, onClick, children }) {
  return (
    <button type="button" className={`choice${on ? ' selected' : ''}`} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}

/** Delivery or pick-up, home or King Hussein Business Park, time slot and a note. */
export function CheckoutFields({ value: c, onChange, pickup = true, deliveryFee }) {
  const { t, pick } = useI18n();
  const set = (patch) => onChange({ ...c, ...patch });

  return (
    <>
      <fieldset className="field">
        <legend>{t('order.how')}</legend>
        <div className="choice-list choice-row">
          <Choice on={c.method === 'delivery'} onClick={() => set({ method: 'delivery' })}>
            <Truck size={18} /> {t('order.delivery')}
            {deliveryFee ? ` · ${deliveryFee}` : ''}
          </Choice>
          {pickup && (
            <Choice on={c.method === 'pickup'} onClick={() => set({ method: 'pickup' })}>
              <ShoppingBag size={18} /> {t('order.pickup')} · {t('order.free')}
            </Choice>
          )}
        </div>
      </fieldset>

      {c.method === 'delivery' && (
        <>
          <fieldset className="field">
            <legend>{t('dest.title')}</legend>
            <div className="choice-list choice-row">
              <Choice on={c.dest === 'home'} onClick={() => set({ dest: 'home' })}>
                <House size={18} /> {t('dest.home')}
              </Choice>
              <Choice on={c.dest === 'park'} onClick={() => set({ dest: 'park' })}>
                <Building2 size={18} /> {t('dest.park')}
              </Choice>
            </div>
          </fieldset>

          {c.dest === 'home' ? (
            <>
              <label className="field">
                <span>{t('fit.area')}</span>
                <select className="input" value={c.area} onChange={(e) => set({ area: e.target.value })}>
                  {AREAS.map((a) => (
                    <option key={a.en} value={a.en}>
                      {pick(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>
                  {t('order.address')} <small className="muted">({t('order.optional')})</small>
                </span>
                <input className="input" value={c.address} maxLength={120} onChange={(e) => set({ address: e.target.value })} placeholder={t('order.addressHint')} />
              </label>
            </>
          ) : (
            <div className="card park-card">
              <p className="small">
                <Building2 size={16} /> {t('dest.parkInfo')}
              </p>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span>{t('dest.building')}</span>
                  <input className="input" value={c.building} maxLength={20} inputMode="numeric" onChange={(e) => set({ building: e.target.value })} placeholder={t('dest.buildingHint')} />
                </label>
                <label className="field" style={{ flex: 1.4 }}>
                  <span>{t('dest.office')}</span>
                  <input className="input" value={c.office} maxLength={60} onChange={(e) => set({ office: e.target.value })} placeholder={t('dest.officeHint')} />
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <label className="field">
        <span>
          <Clock size={16} /> {t('slot.title')}
        </span>
        <select className="input" value={c.slot} onChange={(e) => set({ slot: e.target.value })}>
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {t(`slot.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>
          {t('order.note')} <small className="muted">({t('order.optional')})</small>
        </span>
        <input className="input" value={c.note} maxLength={140} onChange={(e) => set({ note: e.target.value })} placeholder={t('order.noteHint')} />
      </label>
    </>
  );
}
