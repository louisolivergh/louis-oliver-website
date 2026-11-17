'use client';

import { useCallback, useEffect, useState } from 'react';
import { Arrow } from './Icons';

/* used when the Contact page hasn't listed its own */
const DEFAULT_SERVICES = ['Photography', 'Video', 'Photo and video', 'Something else'];
const DEFAULT_BUDGETS = ['Under £500', '£500 to £1,000', '£1,000 to £2,500', '£2,500 to £5,000', '£5,000 or more', 'Not sure yet'];

const pad = (n) => String(n).padStart(2, '0');
const dateParts = (day) => {
  const [y, m, d] = String(day).split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  const f = (o) => at.toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
  return { week: f({ weekday: 'short' }), num: d, month: f({ month: 'short' }), long: f({ weekday: 'long', day: 'numeric', month: 'long' }) };
};
const plusHour = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return `${pad((h + 1) % 24)}:${pad(m)}`;
};

/* Pick a day, then a time: only the hours Louis's calendar has free. */
function CallPicker({ days, loading, pick, onPick }) {
  const [day, setDay] = useState('');
  const shown = days.find((d) => d.date === day) || days[0];

  if (loading) {
    return <p className="call-note">Finding free times…</p>;
  }
  if (!days.length) {
    return <p className="call-note">No free times in the next few weeks. Send your enquiry and I’ll arrange a call with you by email.</p>;
  }
  return (
    <>
      <div className="call-days" aria-label="Pick a day">
        {days.map((d, i) => {
          const p = dateParts(d.date);
          const on = shown && shown.date === d.date;
          return (
            <button key={d.date} type="button" className="call-day" aria-pressed={on} onClick={() => setDay(d.date)} style={{ '--i': i }}>
              <small>{p.week}</small>
              <b>{p.num}</b>
              <small>{p.month}</small>
            </button>
          );
        })}
      </div>
      {shown ? (
        <div className="call-times" key={shown.date} aria-label={`Free times on ${dateParts(shown.date).long}`}>
          {shown.slots.map((t, i) => {
            const on = pick && pick.date === shown.date && pick.time === t;
            return (
              <button key={t} type="button" className="call-time" aria-pressed={on} onClick={() => onPick(on ? null : { date: shown.date, time: t })} style={{ '--i': i }}>
                {t}
              </button>
            );
          })}
        </div>
      ) : null}
      {pick ? (
        <p className="call-picked">
          <span>
            Your call: <b>{dateParts(pick.date).long}, {pick.time} to {plusHour(pick.time)}</b> (UK time)
          </span>
          <button type="button" className="call-clear" onClick={() => onPick(null)}>
            Remove
          </button>
        </p>
      ) : null}
    </>
  );
}

export default function ContactForm({ compact = false, services = [], budgets = [], email = '', title = '' }) {
  const [state, setState] = useState({ status: 'idle', msg: '' });
  const [times, setTimes] = useState({ loading: true, on: false, days: [] });
  const [pick, setPick] = useState(null);
  const serviceList = services.length ? services : DEFAULT_SERVICES;
  const budgetList = budgets.length ? budgets : DEFAULT_BUDGETS;

  const loadTimes = useCallback(async () => {
    try {
      const res = await fetch('/api/availability', { cache: 'no-store' });
      const json = await res.json();
      setTimes({ loading: false, on: Boolean(json && json.on), days: Array.isArray(json && json.days) ? json.days : [] });
    } catch {
      setTimes({ loading: false, on: false, days: [] });
    }
  }, []);

  useEffect(() => {
    loadTimes();
  }, [loadTimes]);

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.email) {
      setState({ status: 'error', msg: 'Please add your name and email.' });
      return;
    }
    setState({ status: 'sending', msg: '' });
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        setPick(null);
        loadTimes();
        setState({ status: 'error', msg: 'Sorry, that call time has just been taken. Please pick another one.' });
        return;
      }
      if (!res.ok) throw new Error('failed');
      const booked = pick;
      form.reset();
      setPick(null);
      loadTimes();
      setState({
        status: 'sent',
        msg: booked
          ? `Thanks! Your call is booked for ${dateParts(booked.date).long} at ${booked.time} (UK time). I’ll be in touch shortly.`
          : 'Thanks, I’ll be in touch shortly!',
      });
    } catch {
      setState({
        status: 'error',
        msg: email ? `Sorry, that didn’t send. Please email ${email} instead.` : 'Sorry, that didn’t send. Please try again or email me directly.',
      });
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {title ? <h2 className="display" style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{title}</h2> : null}
      <div className="form-row">
        <label className="field">Name<input className="input" type="text" name="name" autoComplete="name" required /></label>
        <label className="field">Company<input className="input" type="text" name="company" autoComplete="organization" /></label>
      </div>
      <div className="form-row">
        <label className="field">Email<input className="input" type="email" name="email" autoComplete="email" required /></label>
        {!compact ? <label className="field">Phone<input className="input" type="tel" name="phone" autoComplete="tel" /></label> : null}
      </div>
      <div className="form-row">
        <label className="field">Service
          <select className="input" name="service" defaultValue="">
            <option value="">Select a service</option>
            {serviceList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">Budget
          <select className="input" name="budget" defaultValue="">
            <option value="">Select a range</option>
            {budgetList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="field">Project details<textarea className="input" name="details" rows={compact ? 3 : 4} /></label>
      {times.loading || times.on ? (
        <fieldset className="call">
          <legend className="field">
            Book a call <span className="call-opt">optional</span>
          </legend>
          <p className="call-note">Pick a time for a chat about your project. Each call is an hour, in UK time.</p>
          <CallPicker days={times.days} loading={times.loading} pick={pick} onPick={setPick} />
          <input type="hidden" name="callDate" value={pick ? pick.date : ''} />
          <input type="hidden" name="callTime" value={pick ? pick.time : ''} />
        </fieldset>
      ) : null}
      {state.msg ? <p role="status" className={`form-note ${state.status === 'error' ? 'err' : 'ok'}`}>{state.msg}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={state.status === 'sending'} style={{ alignSelf: 'flex-start' }}>
        {state.status === 'sending' ? 'Sending…' : pick ? 'Send and book the call' : 'Send enquiry'} <Arrow />
      </button>
    </form>
  );
}
