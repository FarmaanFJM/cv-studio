import React, { useRef, useState } from 'react';
import {
  FOOTER_MAX, SectionFooter, editFooterText, hasFooter, linkIndexAt, parseUrlInput, removeLinkAt, upsertLink
} from '../../shared/footer';
import { Icon } from '../icons';
import { SummaButton, SummaField } from '../ui';

interface Props { footer: SectionFooter | undefined; onChange: (f: SectionFooter | undefined) => void }

interface LinkDraft { start: number; end: number; label: string; url: string; index: number }

/**
 * Afsluitende tekst onder een onderdeel. Leeg: alleen de stille actie "+ Afsluitende tekst". Gevuld: één compact tekstveld.
 * Een link maak je door tekst te selecteren (of de cursor in een bestaande link te zetten) en op "Link" te klikken.
 */
export function SectionFooterEditor({ footer, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [error, setError] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const filled = hasFooter(footer);

  if (!filled && !open) {
    return (
      <div className="btn-row">
        <SummaButton small kind="ghost" name="footer-add" onClick={() => { setOpen(true); window.setTimeout(() => area.current?.focus(), 0); }}>
          <Icon name="plus" size={14} /> Afsluitende tekst
        </SummaButton>
      </div>
    );
  }

  const text = footer?.text ?? '';
  const readSel = (): [number, number] => {
    const el = area.current;
    return el ? [el.selectionStart ?? 0, el.selectionEnd ?? 0] : sel;
  };
  const here = linkIndexAt(footer, sel[0], sel[1]);

  const startLink = () => {
    const [a, b] = readSel();
    const i = linkIndexAt(footer, a, b);
    setError('');
    if (i >= 0 && footer) {
      const l = footer.links[i];
      setDraft({ start: l.start, end: l.end, label: text.slice(l.start, l.end), url: l.url, index: i });
    } else {
      setDraft({ start: a, end: b, label: text.slice(a, b), url: '', index: -1 });
    }
  };
  const saveLink = () => {
    if (!draft) return;
    const url = parseUrlInput(draft.url);
    if (!url) { setError('Gebruik een webadres met https:// of http://'); return; }
    if (!draft.label.trim()) { setError('Vul de tekst van de link in'); return; }
    onChange(upsertLink(footer, draft.start, draft.end, draft.label, url));
    setDraft(null); setError('');
    window.setTimeout(() => area.current?.focus(), 0);
  };
  const dropLink = () => {
    if (footer && draft && draft.index >= 0) onChange(removeLinkAt(footer, draft.index));
    setDraft(null); setError('');
  };
  const cancel = () => { setDraft(null); setError(''); window.setTimeout(() => area.current?.focus(), 0); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveLink(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
  };

  return (
    <div className="footer-edit" ref={wrap}
      onBlur={(e) => { if (!filled && !draft && !wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <SummaField label="Afsluitende tekst">
        <textarea ref={area} className="input textarea" data-testid="footer-text" rows={2} maxLength={FOOTER_MAX} value={text}
          style={{ minHeight: 56 }}
          onChange={(e) => { onChange(editFooterText(footer, e.target.value)); setSel([e.target.selectionStart, e.target.selectionEnd]); }}
          onSelect={(e) => setSel([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])} />
      </SummaField>
      {draft ? (
        <div className="footer-link-form" role="group" aria-label="Link">
          <SummaField label="Tekst van de link">
            <input className="input" data-testid="footer-link-label" value={draft.label} autoFocus onKeyDown={key}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </SummaField>
          <SummaField label="Webadres" error={error}>
            <input className="input" data-testid="footer-link-url" value={draft.url} placeholder="https://" inputMode="url" aria-invalid={!!error} onKeyDown={key}
              onChange={(e) => { setDraft({ ...draft, url: e.target.value }); setError(''); }} />
          </SummaField>
          <div className="btn-row">
            <SummaButton small kind="primary" name="footer-link-save" onClick={saveLink}>Opslaan</SummaButton>
            <SummaButton small kind="ghost" name="footer-link-cancel" onClick={cancel}>Annuleren</SummaButton>
            {draft.index >= 0 && <SummaButton small kind="ghost" name="footer-link-remove" onClick={dropLink}>Link verwijderen</SummaButton>}
          </div>
        </div>
      ) : (
        <div className="btn-row">
          <SummaButton small kind="ghost" name="footer-link" onClick={startLink}>
            <Icon name="link" size={14} /> {here >= 0 ? 'Link bewerken' : 'Link'}
          </SummaButton>
          <SummaButton small kind="ghost" name="footer-remove" onClick={() => { onChange(undefined); setOpen(false); }}>Verwijderen</SummaButton>
        </div>
      )}
    </div>
  );
}
