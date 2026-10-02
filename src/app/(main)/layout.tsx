import MainLayout from "@/shared/layout/MainLayout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}