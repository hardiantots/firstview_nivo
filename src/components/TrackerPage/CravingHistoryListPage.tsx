import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Mock data for all craving history
const allCravingHistory = [
    { id: 1, emotion: "Stres", date: "Sabtu, 4 Juli 2025 14:30", intensity: 5, location: "di kantor", situation: "Banyak disekitar saya merokok" },
    { id: 2, emotion: "Bosan", date: "Jumat, 3 Juli 2025 20:15", intensity: 3, location: "di rumah", situation: "Menonton TV sendirian" },
    { id: 3, emotion: "Cemas", date: "Jumat, 3 Juli 2025 09:51", intensity: 2, location: "di kafe", situation: "Menunggu teman" },
    { id: 4, emotion: "Lelah", date: "Kamis, 2 Juli 2025 18:00", intensity: 4, location: "di mobil", situation: "Macet di jalan pulang" },
    { id: 5, emotion: "Senang", date: "Rabu, 1 Juli 2025 21:00", intensity: 1, location: "di pesta", situation: "Merayakan dengan teman" },
    { id: 6, emotion: "Stres", date: "Selasa, 30 Juni 2025 10:00", intensity: 5, location: "di kantor", situation: "Deadline pekerjaan" },
    { id: 7, emotion: "Bosan", date: "Senin, 29 Juni 2025 15:45", intensity: 2, location: "di rumah", situation: "Tidak ada kerjaan" },
    { id: 8, emotion: "Cemas", date: "Minggu, 28 Juni 2025 11:20", intensity: 4, location: "di tempat umum", situation: "Menunggu hasil ujian" },
];

const ITEMS_PER_PAGE = 5;

const CravingHistoryListPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

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
    navigate(`/craving-history/${item.id}`, { state: { craving: item } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Semua Riwayat Craving</h1>
      </div>

      <main className="p-6 space-y-4">
        {currentItems.map((item, index) => {
          const style = getCravingStyle(item.intensity);
          return (
            <div
              key={index}
              className={`p-4 rounded-xl ${style.color} flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-gray-200`}
              onClick={() => handleCravingHistoryClick(item)}
            >
              <div className={`w-3 h-3 rounded-full ${style.dot}`}></div>
              <div className="flex-1">
                <div className="font-semibold text-base">{item.emotion}</div>
                <div className="text-xs opacity-80">{item.date}</div>
              </div>
              <div className="text-sm font-semibold">Intensitas: {item.intensity}</div>
            </div>
          );
        })}
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
  );
};

export default CravingHistoryListPage;