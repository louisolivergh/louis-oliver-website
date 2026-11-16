'use client';

import { useState } from 'react';
import { Arrow } from './Icons';

export default function ContactForm({ compact = false, services = [], budgets = [], email = '', title = '' }) {
  const [state, setState] = useState({ status: 'idle', msg: '' });

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
      if (!res.ok) throw new Error('failed');
      form.reset();
      setState({ status: 'sent', msg: 'Thanks, I’ll be in touch shortly!' });
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
      {!compact && (services.length || budgets.length) ? (
        <div className="form-row">
          {services.length ? (
            <label className="field">Service
              <select className="input" name="service" defaultValue="">
                <option value="">Select a service</option>
                {services.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          ) : null}
          {budgets.length ? (
            <label className="field">Budget
              <select className="input" name="budget" defaultValue="">
                <option value="">Select a range</option>
                {budgets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      <label className="field">Project details<textarea className="input" name="details" rows={compact ? 3 : 4} /></label>
      {state.msg ? <p role="status" className={`form-note ${state.status === 'error' ? 'err' : 'ok'}`}>{state.msg}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={state.status === 'sending'} style={{ alignSelf: 'flex-start' }}>
        {state.status === 'sending' ? 'Sending…' : 'Send enquiry'} <Arrow />
      </button>
    </form>
  );
}
