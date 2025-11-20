'use client'

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, MessageSquare, Activity, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CravingHistoryDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [craving, setCraving] = useState<any>(null);

  useEffect(() => {
    // Get craving data from localStorage
    const storedCraving = localStorage.getItem('cravingDetail');
    if (storedCraving) {
      setCraving(JSON.parse(storedCraving));
      // Clean up after use
      localStorage.removeItem('cravingDetail');
    }
  }, []);

  if (!craving) {
    // Handle case where state is not passed, maybe fetch from API using id
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-xl font-bold">Craving History Not Found</h1>
          <p className="mb-4 text-gray-600">The details for this craving could not be loaded.</p>
          <button onClick={() => router.back()} className="text-blue-500 underline hover:text-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getIntensityStyle = (intensity: number) => {
    if (intensity >= 4) return "bg-red-100 text-red-800 border-red-200";
    if (intensity === 3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Detail Riwayat</h1>
      </div>

      <main className="p-6 space-y-6">
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{craving.emotion}</h2>
            <Badge variant="outline" className={`text-sm font-semibold ${getIntensityStyle(craving.intensity)}`}>
              Intensitas: {craving.intensity}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{craving.date}</span>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-800">Lokasi</h3>
          </div>
          <p className="text-gray-700">{craving.location}</p>
        </div>

        {/* Situation Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-800">Situasi</h3>
          </div>
          <p className="text-gray-700">{craving.situation}</p>
        </div>

        {/* AI Suggestion (Placeholder) */}
        <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Saran AI</h3>
          </div>
          <p className="text-green-700 text-sm">Coba alihkan perhatian dengan berjalan-jalan singkat atau mendengarkan musik yang menenangkan.</p>
        </div>
      </main>
    </div>
  );
};

export default CravingHistoryDetailPage;