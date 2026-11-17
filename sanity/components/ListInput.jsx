'use client';

/**
 * Email addresses, phone numbers or other names on a client or company: one box each, saved as you
 * type (Sanity's own tag boxes only keep what you type once you press Enter, so a number typed and
 * left there was lost). "Add another" gives a new box. Styles: app/studio/studio.css (".lo-list…").
 */

import { useEffect, useRef, useState } from 'react';
import { set, unset } from 'sanity';
import { PlusIcon } from './DashIcons';

const KINDS = {
  email: { type: 'email', inputMode: 'email', placeholder: 'name@business.co.uk', add: 'Add another email', label: 'Email address' },
  phone: { type: 'tel', inputMode: 'tel', placeholder: 'e.g. 07700 900123', add: 'Add another number', label: 'Phone number' },
  name: { type: 'text', inputMode: 'text', placeholder: 'Another name they go by', add: 'Add another name', label: 'Other name' },
};

function ListInput({ kind, value, onChange, readOnly, elementProps }) {
  const k = KINDS[kind] || KINDS.name;
  const items = Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : '')) : [];
  // empty boxes waiting to be typed in (there's always one when the list is empty)
  const [extra, setExtra] = useState(0);
  const shown = items.length ? extra : Math.max(1, extra);
  const rows = [...items, ...Array.from({ length: shown }, () => '')];
  const refs = useRef([]);
  const focusRow = useRef(-1);

  useEffect(() => {
    const el = refs.current[focusRow.current];
    if (focusRow.current >= 0 && el) {
      el.focus();
      focusRow.current = -1;
    }
  });

  const save = (list) => onChange(list.length ? set(list) : unset());
  const change = (i, v) => {
    if (i < items.length) {
      const next = items.slice();
      next[i] = v;
      save(next);
    } else if (v) {
      // typing in a new box makes it part of the list straight away
      setExtra((n) => Math.max(0, (items.length ? n : Math.max(1, n)) - 1));
      save([...items, v]);
    }
  };
  // once you move on, boxes left empty go and stray spaces are trimmed
  const tidy = (e) => {
    if (elementProps && typeof elementProps.onBlur === 'function') elementProps.onBlur(e);
    const next = items.map((v) => v.trim()).filter(Boolean);
    if (next.length !== items.length || next.some((v, i) => v !== items[i])) save(next);
  };
  const remove = (i) => {
    if (i < items.length) save(items.filter((_, j) => j !== i));
    else setExtra((n) => Math.max(0, n - 1));
  };
  const add = () => {
    focusRow.current = rows.length;
    setExtra((n) => (items.length ? n : Math.max(1, n)) + 1);
  };

  return (
    <div className="lo-list" data-kind={kind}>
      {rows.map((v, i) => (
        <div key={i} className="lo-list-row">
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={i === 0 && elementProps ? elementProps.id : undefined}
            className="lo-native"
            type={k.type}
            inputMode={k.inputMode}
            autoComplete="off"
            spellCheck={kind === 'name'}
            value={v}
            placeholder={i === 0 ? k.placeholder : ''}
            aria-label={rows.length > 1 ? `${k.label} ${i + 1}` : k.label}
            readOnly={readOnly}
            onChange={(e) => change(i, e.target.value)}
            onBlur={tidy}
          />
          {!readOnly && (rows.length > 1 || v) ? (
            <button type="button" className="lo-list-x" onClick={() => remove(i)} aria-label={v ? `Remove ${v}` : 'Remove this box'} title="Remove">
              ×
            </button>
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <button type="button" className="lo-list-add" onClick={add}>
          <PlusIcon /> {k.add}
        </button>
      ) : null}
    </div>
  );
}

export const EmailListInput = (props) => <ListInput {...props} kind="email" />;
export const PhoneListInput = (props) => <ListInput {...props} kind="phone" />;
export const NameListInput = (props) => <ListInput {...props} kind="name" />;
