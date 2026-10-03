'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Brain } from 'lucide-react';
import { CravingHistoryItem, toCravingHistoryItem } from './craving-history';
import { PageNavigation } from '@/components/ui/page-navigation';
import { useCompactLayout } from '@/shared/hooks/use-compact-layout';
import { fetchRecentCravingLogs } from '@/lib/db/cravingLogs';
import { supabase } from '@/lib/supabase';
import CravingHistoryDetailPage from './CravingHistoryDetailPage';

const CravingHistoryListPage = () => {
  const compact = useCompactLayout(),
    perPage = compact ? 3 : 5;
  const router = useRouter();
  const searchParams = useSearchParams();
  const cravingId = searchParams.get('id');
  const [currentPage, setCurrentPage] = useState(1);
  const [allCravingHistory, setAllCravingHistory] = useState<CravingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setCurrentPage(1);
  }, [perPage]);

  useEffect(() => {
    const loadCravingHistory = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;
        const userId = user.id;
        const logs = await fetchRecentCravingLogs(userId, 100); // Fetch up to 100 records
        const mapped = logs.map(toCravingHistoryItem);
        setAllCravingHistory(mapped);
      } catch (error) {
        console.error('Failed to fetch craving history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCravingHistory();
  }, []);

  // Jika ada cravingId di query parameter, tampilkan detail
  if (cravingId) {
    return <CravingHistoryDetailPage />;
  }

  const totalPages = Math.ceil(allCravingHistory.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const currentItems = allCravingHistory.slice(startIndex, startIndex + perPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getCravingStyle = (intensity: number) => {
    if (intensity >= 4) return { color: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
    if (intensity === 3) return { color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' };
    return { color: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
  };

  const handleCravingHistoryClick = (item: (typeof allCravingHistory)[0]) => {
    router.push(`/craving-history/${item.id}`);
  };

  return (
    <div className="bg-background">
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 flex items-center gap-4 border-b border-border">
          <button onClick={() => router.back()} className="nivo-icon-button" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Semua Riwayat Craving</h1>
        </div>

        <main className="nivo-page flex-1">
          {isLoading ? (
            <div className="nivo-glass text-center p-6 py-12" role="status">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Memuat riwayat...</p>
            </div>
          ) : allCravingHistory.length === 0 ? (
            <div className="nivo-glass nivo-glass-warm text-center p-6 py-12">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Belum ada riwayat craving</p>
              <p className="text-sm text-gray-500">
                Mulai catat craving pertamamu untuk melacak pola dan trigger
              </p>
            </div>
          ) : (
            currentItems.map((item) => {
              const style = getCravingStyle(item.intensity);
              return (
                <button
                  type="button"
                  key={item.id}
                  className="nivo-glass nivo-history-card p-4 w-full text-left flex flex-wrap items-center gap-3 text-foreground"
                  onClick={() => handleCravingHistoryClick(item)}
                >
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`}
                    aria-hidden="true"
                  ></span>
                  <div className="flex-1 min-w-[120px]">
                    <div className="font-semibold text-base">{item.date}</div>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${style.color}`}>
                    Intensitas: {item.intensity}
                  </span>
                </button>
              );
            })
          )}
        </main>

        {totalPages > 1 && (
          <footer className="p-6">
            <PageNavigation
              label="Halaman riwayat craving"
              page={currentPage - 1}
              pages={totalPages}
              onChange={(index) => handlePageChange(index + 1)}
            />
          </footer>
        )}
      </div>
    </div>
  );
};

export default CravingHistoryListPage;
