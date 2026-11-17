import React, { useEffect, useId, useMemo, useState } from 'react';
import type { UbigeoRow } from '../data/ubigeos';

/** El catálogo (~1 900 distritos) se descarga solo cuando alguien abre un campo de ubigeo. */
let catalogPromise: Promise<readonly UbigeoRow[]> | null = null;
const loadCatalog = () => (catalogPromise ??= import('../data/ubigeos').then((m) => m.UBIGEOS));

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

interface UbigeoPickerProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

/**
 * Buscador de ubigeo INEI: se escribe el distrito (o provincia, o el código) y se elige de la lista.
 * Guarda el código de 6 dígitos que pide el SIAGIE y muestra a qué lugar corresponde.
 */
export const UbigeoPicker: React.FC<UbigeoPickerProps> = ({ id, value, onChange, placeholder = 'Escribe el distrito o el código', invalid }) => {
  const listId = useId();
  const [catalog, setCatalog] = useState<readonly UbigeoRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (value && !catalog) void loadCatalog().then(setCatalog);
  }, [value, catalog]);

  const selected = useMemo(() => (value && catalog ? catalog.find((u) => u[0] === value) ?? null : null), [value, catalog]);

  const matches = useMemo(() => {
    if (!catalog) return [];
    const q = fold(query.trim());
    if (q.length < 2) return [];
    if (/^\d+$/.test(q)) return catalog.filter((u) => u[0].startsWith(q)).slice(0, 8);
    const words = q.split(/\s+/);
    const hits = catalog.filter((u) => {
      const text = fold(`${u[3]} ${u[2]} ${u[1]}`);
      return words.every((w) => text.includes(w));
    });
    // Primero los distritos cuyo nombre empieza con lo escrito
    hits.sort((a, b) => Number(!fold(a[3]).startsWith(words[0])) - Number(!fold(b[3]).startsWith(words[0])));
    return hits.slice(0, 8);
  }, [catalog, query]);

  const choose = (row: UbigeoRow) => {
    onChange(row[0]);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        value={open ? query : value ? (selected ? `${selected[3]} (${selected[0]})` : value) : ''}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
          void loadCatalog().then(setCatalog);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          // Si escribe un código completo y válido, se toma directamente
          if (catalog && /^\d{6}$/.test(e.target.value.trim())) {
            const row = catalog.find((u) => u[0] === e.target.value.trim());
            if (row) onChange(row[0]);
          }
        }}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); choose(matches[active]); }
        }}
        className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {matches.map((u, i) => (
            <li
              key={u[0]}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(u); }}
              className={`cursor-pointer px-3 py-1.5 text-xs ${i === active ? 'bg-muted' : ''}`}
            >
              <span className="font-semibold text-foreground">{u[3]}</span>
              <span className="text-muted-foreground"> · {u[2]}, {u[1]} · {u[0]}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {selected
          ? `${selected[3]} · ${selected[2]} · ${selected[1]}`
          : value
            ? 'Código no encontrado en el catálogo del INEI.'
            : 'Escribe el nombre del distrito y elígelo de la lista.'}
        {value && (
          <button type="button" className="ml-2 text-primary hover:underline" onClick={() => onChange('')}>Quitar</button>
        )}
      </p>
    </div>
  );
};
