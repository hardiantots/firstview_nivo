'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import { Panel, StateNotice } from '@/components/ui/nivo';
import { dateBefore, JourneyAction, JourneyState } from '@/shared/journey/domain';
import { formatDate } from '@/shared/lib/format';

export default function QuickLog({
  state,
  today,
  busy,
  onSave,
}: {
  state: JourneyState;
  today: string;
  busy: boolean;
  onSave: (action: JourneyAction) => Promise<boolean>;
}) {
  const [date, setDate] = useState(today),
    [count, setCount] = useState<string>(String(state.daily[today]?.count ?? 0)),
    [notice, setNotice] = useState('');
  const id = useId();
  const choose = (value: string) => {
    setDate(value);
    setCount(String(state.daily[value]?.count ?? 0));
    setNotice('');
  };
  const save = async (value: number | null, selected = date) => {
    setNotice('');
    if (await onSave({ type: 'daily', date: selected, count: value }))
      setNotice(`Catatan ${formatDate(selected)} tersimpan.`);
  };
  return (
    <section id="catat">
      <Panel title="Catat konsumsi harian" className="nivo-today-card">
        <div className="nivo-button-row" role="group" aria-label="Pilih hari catatan">
          {[
            [today, 'Hari ini'],
            [dateBefore(today, 1), 'Kemarin'],
          ].map(([value, label]) => (
            <button
              key={value}
              className="nivo-action nivo-action-secondary"
              disabled={busy}
              aria-pressed={date === value}
              onClick={() => choose(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="nivo-caption">
          {formatDate(date)} ·{' '}
          {state.daily[date]?.status === 'reported'
            ? `${state.daily[date].count} batang tersimpan`
            : 'Belum tercatat'}
        </p>
        <form
          className="nivo-stack"
          onSubmit={(event) => {
            event.preventDefault();
            save(count === '' ? null : Number(count));
          }}
        >
          <label htmlFor={id} className="font-medium">
            Jumlah batang
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              aria-label="Kurangi satu batang"
              disabled={busy || Number(count) <= 0}
              onClick={() => setCount(String(Math.max(0, Number(count) - 1)))}
            >
              −
            </button>
            <input
              id={id}
              className="min-h-12 w-full min-w-0 rounded-control border border-border bg-white/70 px-3 text-center text-base"
              type="number"
              inputMode="numeric"
              min={0}
              max={200}
              value={count}
              disabled={busy}
              onChange={(event) => setCount(event.target.value)}
              aria-describedby={id + '-hint'}
            />
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              aria-label="Tambah satu batang"
              disabled={busy || Number(count) >= 200}
              onClick={() => setCount(String(Math.min(200, Number(count) + 1)))}
            >
              +
            </button>
          </div>
          <p id={id + '-hint'} className="nivo-caption">
            0 berarti tidak merokok. Kosongkan lalu simpan untuk menandai belum tercatat. Mengubah
            catatan memperbarui total hari itu.
          </p>
          <div className="nivo-button-row">
            <button type="submit" className="nivo-action" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan catatan'}
            </button>
            <button
              type="button"
              className="nivo-action nivo-action-secondary"
              disabled={busy}
              onClick={() => {
                choose(today);
                save(0, today);
              }}
            >
              0 hari ini
            </button>
          </div>
        </form>
        {notice && <StateNotice>{notice}</StateNotice>}
        <Link className="nivo-text-link" href="/craving-support?mode=sos">
          Catat craving
        </Link>
      </Panel>
    </section>
  );
}
