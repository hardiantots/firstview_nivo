"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, getYear, getMonth } from "date-fns";
import { id } from "date-fns/locale";
import { Pencil, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigation, CaptionProps } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import logo from '@/assets/logo-with-text-horizontal.png';
import assetsfirstpage from '@/assets/assetsfirstpage.png';

// --- Komponen Kustom untuk Caption Kalender ---
function CustomCaption({ displayMonth }: CaptionProps) {
  // Gunakan useNavigation() untuk mendapatkan fungsi navigasi
  const { goToMonth } = useNavigation();

  const years = Array.from(
    { length: getYear(new Date()) - 1970 + 1 },
    (_, i) => getYear(new Date()) - i
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    format(new Date(0, i), "MMMM", { locale: id })
  );

  const handleYearChange = (value: string) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(parseInt(value, 10));
    goToMonth(newDate);
  };

  const handleMonthChange = (value: string) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(parseInt(value, 10));
    goToMonth(newDate);
  };

  return (
    <div className="flex justify-between items-center gap-2 mb-4">
      <Select
        value={getMonth(displayMonth).toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-full focus:ring-0">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={month} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={getYear(displayMonth).toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-full focus:ring-0">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
// --- Akhir Komponen Kustom ---

const SetQuitDatePastScreen = () => {
  const router = useRouter();
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const handleContinue = () => {
    if (date) {
      console.log("Selected quit date:", date);
      router.push("/motivation");
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 relative min-h-screen flex flex-col">
        <div className="relative flex justify-center items-center mb-8 pt-8">
          <button
            onClick={() => router.push('/journey-start')}
            className="absolute left-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <Image src={logo} alt="NIVO Logo" className="h-10" height={40} />
        </div>

        <div className="relative z-10">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-lg font-bold text-foreground leading-tight mb-4">
              Luar Biasa! Kapan Anda berhenti merokok?
            </h1>
          </motion.div>

          <div className="flex flex-col items-center space-y-4"> {/* This div is not animated, its children are */}
            <motion.div
              className="w-full bg-white p-3.5 rounded-xl shadow flex items-center justify-center relative mb-2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <span className="text-base font-medium text-gray-800">
                {date ? format(date, "d MMMM yyyy", { locale: id }) : "Pilih tanggal"}
              </span>
              <Button size="icon" variant="default" className="rounded-full h-8 w-8 absolute right-3">
                <Pencil className="h-4 w-4" />
              </Button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(day) => day > new Date() || day < new Date("1900-01-01")}
                fromYear={1970}
                toYear={new Date().getFullYear()}
                className="rounded-md border bg-white shadow p-3"
                components={{
                  Caption: CustomCaption,
                }}
                classNames={{
                  day_selected: "bg-orange-500 text-primary-foreground rounded-md hover:bg-orange-500/90 focus:bg-orange-500",
                  day_today: "bg-orange-500/20 text-accent-foreground rounded-md",
                }}
              />
            </motion.div>
            
            <motion.div
              className="w-full pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
            >
              <Button onClick={handleContinue} disabled={!date} className="w-full">
                Lanjutkan
              </Button>
            </motion.div>
          </div>
        </div>
        {/* Background Image */}
        <div className="absolute bottom-0 right-0 w-[90%] max-w-xs pointer-events-none opacity-80">
          <Image
            src={assetsfirstpage}
            alt="Decorative background graphic"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default SetQuitDatePastScreen;