'use client'

import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, MapPin, Clock, Users, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/ui/app-header";

const ContactProfessionalPage = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const professionals = [
    {
      id: 1,
      name: "Dr. Ahmad Wijaya",
      specialty: "Psikolog Klinis",
      experience: "15+ tahun",
      rating: 4.8,
      reviews: 128,
      available: true,
      phone: "+62 812-3456-7890",
      email: "ahmad.wijaya@email.com",
      address: "Klinik Sehat, Jakarta Pusat",
    },
    {
      id: 2,
      name: "Prof. Siti Nurhaliza",
      specialty: "Konselor Kesehatan Mental",
      experience: "12+ tahun",
      rating: 4.9,
      reviews: 156,
      available: true,
      phone: "+62 821-9876-5432",
      email: "siti.nurhaliza@email.com",
      address: "Pusat Konseling Terpadu, Bandung",
    },
    {
      id: 3,
      name: "Ir. Bambang Sutrisno",
      specialty: "Coach Quit Smoking",
      experience: "10+ tahun",
      rating: 4.7,
      reviews: 95,
      available: true,
      phone: "+62 815-5555-6666",
      email: "bambang.sutrisno@email.com",
      address: "Life Coaching Center, Surabaya",
    },
  ];

  return (
    <div className="relative min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content Container */}
      <div className="w-full">
        <div className="px-4 py-8 mx-auto max-w-2xl">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-green-900">Hubungi Professional</h1>
                <p className="text-sm text-green-700">Dapatkan dukungan dari ahli bersertifikat</p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-teal-200">
            <div className="flex gap-3">
              <MessageSquare className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-teal-900 mb-1">Konsultasi Profesional</p>
                <p className="text-xs text-teal-800">
                  Tim ahli kami siap membantu perjalanan berhenti merokok Anda dengan dukungan personal dan strategi yang terbukti efektif.
                </p>
              </div>
            </div>
          </div>

          {/* Professionals List */}
          <div className="space-y-4">
            {professionals.map((prof) => (
              <div
                key={prof.id}
                className="border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all duration-200"
              >
                {/* Professional Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{prof.name}</h3>
                    <p className="text-sm text-teal-600 font-medium">{prof.specialty}</p>
                  </div>
                  {prof.available && (
                    <div className="bg-green-100 px-2 py-1 rounded-full">
                      <span className="text-xs font-semibold text-green-700">Tersedia</span>
                    </div>
                  )}
                </div>

                {/* Rating and Experience */}
                <div className="flex gap-4 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-1">
                    <div className="text-yellow-400">★</div>
                    <span className="text-sm font-semibold text-gray-700">
                      {prof.rating}
                    </span>
                    <span className="text-xs text-gray-500">({prof.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{prof.experience}</span>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{prof.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{prof.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{prof.address}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => window.open(`tel:${prof.phone}`)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 rounded-lg transition-all"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Telepon
                  </Button>
                  <Button
                    onClick={() => window.open(`mailto:${prof.email}`)}
                    className="w-full border border-teal-600 text-teal-600 hover:bg-teal-50 text-sm font-medium py-2 rounded-lg transition-all"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Support Card */}
          <div className="mt-8 bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
            <h4 className="font-bold text-gray-800 mb-2">Layanan Darurat 24/7</h4>
            <p className="text-sm text-gray-700 mb-3">
              Jika Anda merasa membutuhkan bantuan segera, hubungi hotline kami kapan saja.
            </p>
            <Button
              onClick={() => window.open('tel:+62-1-500-500')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-all"
            >
              Hubungi Hotline: +62-1-500-500
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactProfessionalPage;
