'use client';

import { useEffect, useMemo, useState } from 'react';
import { set, unset, useClient } from 'sanity';
import { EQUIPMENT_CATEGORIES } from '../categories';

const QUERY = `*[_type == "equipment" && !(_id in path("drafts.**"))] | order(order asc, name asc){ _id, name, spec, category }`;

function makeKey() {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * Shows every item from your Equipment list as a tickable button,
 * grouped by category, so you never have to type kit out again.
 */
export function EquipmentTickInput(props) {
  const { value, onChange, readOnly } = props;
  const list = Array.isArray(value) ? value : [];
  const client = useClient({ apiVersion: '2024-10-01' });
  const [kit, setKit] = useState(null);

  useEffect(() => {
    let alive = true;
    client
      .fetch(QUERY)
      .then((res) => alive && setKit(res || []))
      .catch(() => alive && setKit([]));
    return () => {
      alive = false;
    };
  }, [client]);

  const selected = useMemo(() => new Set(list.map((v) => v && v._ref)), [list]);
  // booked shoots use weak links, so kit can still be removed from your list later
  const member = props.schemaType && Array.isArray(props.schemaType.of) ? props.schemaType.of[0] : null;
  const weak = Boolean(member && member.weak);

  const toggle = (id) => {
    if (readOnly) return;
    const next = selected.has(id)
      ? list.filter((v) => v._ref !== id)
      : [...list, { _type: 'reference', _ref: id, _key: makeKey(), ...(weak ? { _weak: true } : {}) }];
    onChange(next.length ? set(next) : unset());
  };

  if (kit === null) return <p style={{ fontSize: 13, opacity: 0.7 }}>Loading your kit…</p>;
  if (!kit.length) {
    return (
      <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
        Your equipment list is empty. Add items under <strong>Equipment</strong> in the left menu,
        then come back here to tick them.
      </p>
    );
  }

  const groups = EQUIPMENT_CATEGORIES.map((c) => ({
    ...c,
    items: kit.filter((k) => k.category === c.value),
  })).filter((g) => g.items.length);
  const other = kit.filter((k) => !EQUIPMENT_CATEGORIES.some((c) => c.value === k.category));
  if (other.length) groups.push({ value: 'other', title: 'Other', items: other });

  return (
    <div className="lo-ticks">
      {groups.map((g) => (
        <div key={g.value} className="lo-tick-group">
          <div className="lo-tick-label">{g.title}</div>
          <div className="lo-tick-row">
            {g.items.map((k) => {
              const on = selected.has(k._id);
              return (
                <button
                  key={k._id}
                  type="button"
                  className="lo-tick"
                  data-on={on ? '' : undefined}
                  aria-pressed={on}
                  onClick={() => toggle(k._id)}
                  disabled={readOnly}
                >
                  <span className="lo-tick-box" aria-hidden="true">
                    <svg viewBox="0 0 12 12" width="10" height="10">
                      <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {k.name}
                  {k.spec ? <span className="lo-tick-spec">· {k.spec}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
