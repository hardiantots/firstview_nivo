'use client'

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Brain } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { fetchRecentCravingLogs } from "@/lib/db/cravingLogs";
import CravingHistoryDetailPage from "./CravingHistoryDetailPage";

const ITEMS_PER_PAGE = 5;

const CravingHistoryListPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cravingId = searchParams.get('id');
  const [currentPage, setCurrentPage] = useState(1);
  const [allCravingHistory, setAllCravingHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Jika ada cravingId di query parameter, tampilkan detail
  if (cravingId) {
    return <CravingHistoryDetailPage />;
  }

  useEffect(() => {
    const loadCravingHistory = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const logs = await fetchRecentCravingLogs(userId, 100); // Fetch up to 100 records
        const mapped = logs.map((log) => ({
          id: log.id,
          emotion: log.mood || "Tidak disebutkan",
          date: format(new Date(log.occurred_at || new Date()), "EEEE, d MMM yyyy HH:mm", { locale: id }),
          intensity: log.intensity || 0,
          location: log.location || "-",
          situation: log.situation || "-",
        }));
        setAllCravingHistory(mapped);
      } catch (error) {
        console.error("Failed to fetch craving history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCravingHistory();
  }, []);

  const totalPages = Math.ceil(allCravingHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = allCravingHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getCravingStyle = (intensity: number) => {
    if (intensity >= 4) return { color: "bg-red-100 text-red-800", dot: "bg-red-500" };
    if (intensity === 3) return { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" };
    return { color: "bg-green-100 text-green-800", dot: "bg-green-500" };
  };

  const handleCravingHistoryClick = (item: typeof allCravingHistory[0]) => {
    localStorage.setItem('cravingDetail', JSON.stringify(item));
    router.push(`/craving-history/${item.id}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Semua Riwayat Craving</h1>
        </div>

        <main className="p-6 space-y-4 flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Memuat riwayat...</p>
            </div>
          ) : allCravingHistory.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Belum ada riwayat craving</p>
              <p className="text-sm text-gray-500">Mulai catat craving pertamamu untuk melacak pola dan trigger</p>
            </div>
          ) : (
            currentItems.map((item, index) => {
              const style = getCravingStyle(item.intensity);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl ${style.color} flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-gray-200`}
                  onClick={() => handleCravingHistoryClick(item)}
                >
                  <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
                  <div className="flex-1">
                    <div className="font-semibold text-base">{item.date}</div>
                  </div>
                  <div className="text-sm font-semibold">Intensitas: {item.intensity}</div>
                </div>
              );
            })
          )}
        </main>

        {totalPages > 1 && (
          <footer className="p-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </footer>
        )}
      </div>
    </div>
  );
};

export default CravingHistoryListPage;