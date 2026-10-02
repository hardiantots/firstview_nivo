export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="nivo-glass nivo-error-card" role="status">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold">Loading...</h1>
        <p className="text-gray-600 mt-2">Memproses autentikasi...</p>
      </div>
    </div>
  );
}
