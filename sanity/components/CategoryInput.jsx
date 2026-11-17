'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { set, unset, useClient } from 'sanity';

/* Suggested categories for photo & video work, edit this list any time */
export const SUGGESTED_CATEGORIES = [
  'Retail',
  'Supermarket',
  'Food & Drink',
  'Product',
  'Brand campaign',
  'Fashion',
  'Lifestyle',
  'Social content',
  'Events',
  'Corporate',
  'Behind the scenes',
];

const CUSTOM = '__custom__';
const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ');
const key = (v) => norm(v).toLowerCase();

/* The look (soft box, blue focus ring) comes from .lo-native in app/studio/studio.css */
const field = {
  width: '100%',
  boxSizing: 'border-box',
  font: 'inherit',
  fontSize: 15,
};

/**
 * Category picker: a dropdown of categories you've used before plus suggestions,
 * with a "custom category" option for anything new.
 */
export function CategoryInput(props) {
  const { value, onChange, readOnly, elementProps } = props;
  const client = useClient({ apiVersion: '2024-10-01' });
  const [used, setUsed] = useState([]);
  const [custom, setCustom] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    client
      .fetch('array::unique(*[_type == "shoot" && defined(category) && category != ""].category)')
      .then((res) => alive && setUsed(Array.isArray(res) ? res : []))
      .catch(() => {});
    return () => { alive = false; };
  }, [client]);

  const { usedList, suggested, known } = useMemo(() => {
    const seen = new Map();
    used.forEach((c) => { const k = key(c); if (k && !seen.has(k)) seen.set(k, norm(c)); });
    const usedList = [...seen.values()].sort((a, b) => a.localeCompare(b));
    const suggested = SUGGESTED_CATEGORIES.filter((c) => !seen.has(key(c)));
    const known = new Map([...usedList, ...suggested].map((c) => [key(c), c]));
    return { usedList, suggested, known };
  }, [used]);

  const current = norm(value);
  const match = known.get(key(current));
  const showCustom = custom || (current && !match);
  const selectValue = showCustom ? CUSTOM : match || '';

  const write = (v) => {
    const clean = norm(v);
    onChange(clean ? set(clean) : unset());
  };

  const onSelect = (e) => {
    const v = e.target.value;
    if (v === CUSTOM) {
      setCustom(true);
      write('');
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      return;
    }
    setCustom(false);
    write(v);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select {...(showCustom ? {} : elementProps)} className="lo-native lo-native-select" value={selectValue} onChange={onSelect} disabled={readOnly} style={{ ...field, cursor: readOnly ? 'default' : 'pointer' }}>
        <option value="">Choose a category…</option>
        {usedList.length ? (
          <optgroup label="Used before">
            {usedList.map((c) => <option key={`u-${c}`} value={c}>{c}</option>)}
          </optgroup>
        ) : null}
        <optgroup label="Suggested">
          {suggested.map((c) => <option key={`s-${c}`} value={c}>{c}</option>)}
        </optgroup>
        <option value={CUSTOM}>+ Add a custom category…</option>
      </select>
      {showCustom ? (
        <input
          {...elementProps}
          ref={inputRef}
          type="text"
          value={value || ''}
          readOnly={readOnly}
          placeholder="Type your category, e.g. Automotive"
          onChange={(e) => onChange(e.target.value ? set(e.target.value) : unset())}
          onBlur={(e) => { if (elementProps && elementProps.onBlur) elementProps.onBlur(e); if (value && value !== norm(value)) write(value); }}
          className="lo-native"
          style={field}
        />
      ) : null}
    </div>
  );
}
