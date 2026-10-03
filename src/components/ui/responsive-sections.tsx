'use client';

import {
  Children,
  createContext,
  isValidElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';
import { PageNavigation } from './page-navigation';

type SectionProps = { name: string; label: string; children: ReactNode };
type SelectionFocus = 'panel' | 'picker' | 'none' | HTMLElement;
const SectionContext = createContext<{
  id: string;
  selected: string;
  paged: boolean;
  tabs: boolean;
} | null>(null);

export function SectionPage({ name, label, children }: SectionProps) {
  const context = useContext(SectionContext);
  if (!context) throw new Error('SectionPage must be inside ResponsiveSections.');
  const visible = !context.paged || context.selected === name;
  const [visited, setVisited] = useState(false);
  useEffect(() => {
    if (visible) setVisited(true);
  }, [visible]);
  return (
    <section
      id={`${context.id}-panel-${name}`}
      data-section-group={context.id}
      data-section-page={name}
      className="nivo-section-page nivo-stack"
      role={context.tabs ? 'tabpanel' : 'region'}
      aria-label={context.tabs ? undefined : label}
      aria-labelledby={context.tabs ? `${context.id}-tab-${name}` : undefined}
      hidden={!visible}
      tabIndex={-1}
    >
      {(visible || visited) && children}
    </section>
  );
}

/** Tablet/phone sections retain visited content, so navigating never clears a form. */
export function ResponsiveSections({
  label,
  children,
  queryKey = 'section',
  defaultSection,
  desktop = 'all',
  desktopClassName,
  value,
  onChange,
}: {
  label: string;
  children: ReactNode;
  queryKey?: string;
  defaultSection?: string;
  desktop?: 'all' | 'tabs';
  desktopClassName?: string;
  value?: string;
  onChange?: (name: string) => void;
}) {
  const id = useId(),
    compact = useCompactLayout(),
    root = useRef<HTMLDivElement>(null),
    picker = useRef<HTMLSelectElement>(null);
  const sections = Children.toArray(children).map((child) => {
    if (!isValidElement<SectionProps>(child) || child.type !== SectionPage)
      throw new Error('ResponsiveSections accepts SectionPage children.');
    return { name: child.props.name, label: child.props.label };
  });
  const signature = sections.map((section) => section.name).join('|');
  const [internal, setInternal] = useState(defaultSection || sections[0]?.name || '');
  const selected = sections.some((section) => section.name === (value ?? internal))
    ? (value ?? internal)
    : sections[0]?.name || '';
  const selectedRef = useRef(selected),
    previousSelection = useRef(selected),
    changeRef = useRef(onChange),
    pendingFocus = useRef<SelectionFocus | null>(null);
  selectedRef.current = selected;
  changeRef.current = onChange;
  const apply = useCallback((name: string) => {
    setInternal(name);
    changeRef.current?.(name);
  }, []);
  const navigate = (name: string, focus: SelectionFocus, replace = false) => {
    if (!sections.some((section) => section.name === name) || name === selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set(queryKey, name);
    // A previous section anchor must not pull the next section back into view.
    url.hash = '';
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    pendingFocus.current = focus;
    apply(name);
  };
  useEffect(() => {
    const names = signature.split('|');
    const readLocation = () => {
      const url = new URL(window.location.href);
      let anchor = '';
      try {
        anchor = decodeURIComponent(url.hash.slice(1));
      } catch {
        // Invalid anchors do not change the selected section.
      }
      const next = names.includes(anchor)
        ? anchor
        : names.includes(url.searchParams.get(queryKey) || '')
          ? url.searchParams.get(queryKey)!
          : defaultSection || names[0];
      if (next && next !== selectedRef.current) {
        pendingFocus.current = 'none';
        apply(next);
      }
    };
    readLocation();
    window.addEventListener('popstate', readLocation);
    window.addEventListener('hashchange', readLocation);
    return () => {
      window.removeEventListener('popstate', readLocation);
      window.removeEventListener('hashchange', readLocation);
    };
  }, [signature, queryKey, defaultSection, apply]);
  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    if (value !== undefined) {
      const url = new URL(window.location.href);
      if (url.searchParams.get(queryKey) !== selected) {
        url.searchParams.set(queryKey, selected);
        window.history.replaceState(null, '', url);
      }
      if (compact && pendingFocus.current === null) pendingFocus.current = 'panel';
    }
  }, [selected, value, queryKey, compact]);
  useEffect(() => {
    const focus = pendingFocus.current;
    if (focus === null) return;
    pendingFocus.current = null;
    const frame = requestAnimationFrame(() => {
      if (focus === 'none') return;
      root.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      const target =
        focus === 'picker'
          ? picker.current
          : focus === 'panel'
            ? document.getElementById(`${id}-panel-${selected}`)
            : focus;
      target?.focus({ preventScroll: true });
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        if (focus instanceof HTMLElement) {
          target.scrollIntoView({ block: 'center', behavior: 'instant' });
          target.reportValidity();
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [id, selected]);
  const current = sections.findIndex((section) => section.name === selected),
    tabs = !compact && desktop === 'tabs';
  const paging = (position: 'top' | 'bottom') => (
    <PageNavigation
      label={`Pagination ${label} — ${position === 'top' ? 'awal' : 'akhir'}`}
      page={current}
      pages={sections.length}
      unit="Bagian"
      previousName={sections[current - 1]?.label}
      nextName={sections[current + 1]?.label}
      onChange={(page) => navigate(sections[page].name, 'panel')}
    />
  );
  return (
    <div
      ref={root}
      className="nivo-section-pager nivo-stack"
      data-section-pager={queryKey}
      onInvalidCapture={(event) => {
        const control = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const first =
          control.form &&
          Array.from(control.form.elements).find((element) => {
            const field = element as HTMLInputElement;
            return field.willValidate && !field.validity.valid;
          });
        const panel = control.closest<HTMLElement>(`[data-section-group="${id}"]`);
        if (first === control && panel?.hidden) {
          event.preventDefault();
          navigate(panel.dataset.sectionPage!, control, true);
        }
      }}
    >
      {compact && sections.length > 1 && (
        <div className="nivo-section-navigation nivo-glass">
          <label htmlFor={`${id}-picker`}>Bagian {label}</label>
          <select
            ref={picker}
            id={`${id}-picker`}
            value={selected}
            aria-controls={`${id}-panel-${selected}`}
            onChange={(event) => navigate(event.target.value, 'picker')}
          >
            {sections.map((section, index) => (
              <option value={section.name} key={section.name}>
                {index + 1}. {section.label}
              </option>
            ))}
          </select>
          {paging('top')}
        </div>
      )}
      {tabs && (
        <div
          role="tablist"
          aria-label={label}
          className="nivo-tabs"
          onKeyDown={(event) => {
            const next =
              event.key === 'ArrowRight'
                ? (current + 1) % sections.length
                : event.key === 'ArrowLeft'
                  ? (current - 1 + sections.length) % sections.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? sections.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            navigate(sections[next].name, 'none');
            (
              event.currentTarget.querySelectorAll('[role="tab"]')[next] as HTMLButtonElement
            ).focus();
          }}
        >
          {sections.map((section) => (
            <button
              key={section.name}
              type="button"
              role="tab"
              id={`${id}-tab-${section.name}`}
              aria-controls={`${id}-panel-${section.name}`}
              aria-selected={section.name === selected}
              tabIndex={section.name === selected ? 0 : -1}
              onClick={() => navigate(section.name, 'none')}
            >
              {section.label}
            </button>
          ))}
        </div>
      )}
      <SectionContext.Provider value={{ id, selected, paged: compact || tabs, tabs }}>
        <div
          className={cn(
            'nivo-section-pages',
            compact || tabs ? 'nivo-stack' : desktopClassName || 'nivo-stack',
          )}
        >
          {children}
        </div>
      </SectionContext.Provider>
      {compact && sections.length > 1 && paging('bottom')}
    </div>
  );
}
