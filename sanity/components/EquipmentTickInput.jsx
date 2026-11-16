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

  const toggle = (id) => {
    if (readOnly) return;
    const next = selected.has(id)
      ? list.filter((v) => v._ref !== id)
      : [...list, { _type: 'reference', _ref: id, _key: makeKey() }];
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((g) => (
        <div key={g.value} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {g.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {g.items.map((k) => {
              const on = selected.has(k._id);
              return (
                <button
                  key={k._id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(k._id)}
                  disabled={readOnly}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px 8px 10px',
                    borderRadius: 999,
                    border: `1.5px solid ${on ? '#104de6' : 'rgba(127,127,127,0.35)'}`,
                    background: on ? '#104de6' : 'transparent',
                    color: on ? '#fff' : 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: readOnly ? 'default' : 'pointer',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `1.5px solid ${on ? '#fff' : 'rgba(127,127,127,0.5)'}`,
                      background: on ? '#fff' : 'transparent',
                      color: '#104de6',
                      fontSize: 11,
                      lineHeight: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {on ? '✓' : ''}
                  </span>
                  {k.name}
                  {k.spec ? <span style={{ opacity: 0.75 }}>· {k.spec}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
