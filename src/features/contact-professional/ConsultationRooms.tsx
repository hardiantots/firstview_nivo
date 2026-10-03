'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/nivo';
import { PageNavigation } from '@/components/ui/page-navigation';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';

export default function ConsultationRooms({
  rooms,
  onOpen,
  onReload,
}: {
  rooms: { id: string }[];
  onOpen: (id: string) => void;
  onReload: () => void;
}) {
  const compact = useCompactLayout(),
    perPage = compact ? 3 : 7;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(rooms.length / perPage);
  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pages - 1)));
  }, [pages]);
  return (
    <Panel title="Sesi saya">
      {rooms.length ? (
        <div className="nivo-stack">
          {rooms.slice(page * perPage, page * perPage + perPage).map((room) => (
            <button
              type="button"
              key={room.id}
              className="nivo-action nivo-action-secondary"
              onClick={() => onOpen(room.id)}
            >
              Buka sesi {room.id.slice(0, 8)}
            </button>
          ))}
        </div>
      ) : (
        <p>Belum ada sesi.</p>
      )}
      <PageNavigation
        label="Halaman sesi konsultasi"
        page={page}
        pages={pages}
        onChange={setPage}
      />
      <button type="button" className="nivo-action" onClick={onReload}>
        Muat ulang sesi
      </button>
    </Panel>
  );
}
