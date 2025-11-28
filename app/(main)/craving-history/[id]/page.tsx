import CravingHistoryDetailPage from "@/components/TrackerPage/CravingHistoryDetailPage"
import AuthGuard from "@/components/AuthGuard"

export default function CravingHistoryDetailPageMain() {
  return (
    <AuthGuard>
      <CravingHistoryDetailPage />
    </AuthGuard>
  )
}