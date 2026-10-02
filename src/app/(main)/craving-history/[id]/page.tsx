import CravingHistoryDetailPage from "@/features/tracker/TrackerPage/CravingHistoryDetailPage"
import AuthGuard from "@/shared/auth/AuthGuard"

export default function CravingHistoryDetailPageMain() {
  return (
    <AuthGuard>
      <CravingHistoryDetailPage />
    </AuthGuard>
  )
}