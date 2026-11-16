import { Plus } from './Icons';

export default function Faqs({ items }) {
  return (
    <div>
      {items.map((f, i) => (
        <details key={i} className="faq" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
          <summary>
            <span className="faq-q" style={{ color: '#fff' }}>{f.question}</span>
            <span style={{ color: '#fff' }}>
              <Plus />
            </span>
          </summary>
          <p className="faq-a pre" style={{ color: 'rgba(255,255,255,0.9)' }}>{f.answer}</p>
        </details>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }} />
    </div>
  );
}
