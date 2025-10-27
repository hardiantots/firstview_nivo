import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading";
import { useApiLoading } from "@/hooks/useApiLoading";
import logo from "@/assets/logo-with-text-horizontal.png";

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'whatsapp' | 'system';
  sender?: string;
}

const NotificationPage = () => {
  const navigate = useNavigate();
  const { isLoading, withLoading } = useApiLoading();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Simulate API call to fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      await withLoading(async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        setNotifications([
          {
            id: '1',
            message: 'Selamat! Anda telah berhasil tidak merokok selama 7 hari berturut-turut!',
            timestamp: '2024-01-15 14:30',
            isRead: false,
            type: 'system'
          },
          {
            id: '2',
            message: 'Reminder: Jangan lupa untuk mencatat konsumsi rokok hari ini',
            timestamp: '2024-01-14 09:00',
            isRead: true,
            type: 'system'
          },
          {
            id: '3',
            message: 'Dukungan WhatsApp: "Tetap semangat! Kamu pasti bisa!"',
            timestamp: '2024-01-13 16:45',
            isRead: false,
            type: 'whatsapp',
            sender: 'Support Team'
          }
        ]);
      });
    };

    fetchNotifications();
  }, []);

  // Separate notifications by read status
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
    return `${Math.floor(diffInHours / 24)} hari yang lalu`;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-gray-100 sticky top-0 z-10">
          <ArrowLeft 
            className="w-6 h-6 text-gray-600 cursor-pointer" 
            onClick={() => navigate("/home")}
          />
          <div className="flex items-center gap-2">
            <img src={logo} alt="NIVO Logo" className="h-8"/>
          </div>
          <div className="w-6 h-6" />
        </div>

        {/* Main Content */}
        <main className="px-4 py-6 flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifikasi</h1>

          {/* No notifications state */}
          {notifications.length === 0 && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Tidak ada notifikasi</h3>
              <p className="text-sm text-gray-500">Semua notifikasi akan muncul di sini</p>
            </div>
          )}

          {/* Unread notifications */}
          {unreadNotifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Notifikasi Terkini
              </h2>
              <div className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 cursor-pointer hover:shadow-xl transition-shadow duration-200"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {notification.type === 'whatsapp' ? (
                          <MessageCircle className={`w-5 h-5 ${
                            notification.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        ) : (
                          <div className="w-5 h-5 bg-primary rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notification.sender && (
                          <p className="text-xs text-gray-500 mb-1">{notification.sender}</p>
                        )}
                        <p className="text-sm text-gray-800 leading-5 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{formatTime(notification.timestamp)}</span>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read notifications */}
          {readNotifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Notifikasi Terakhir
              </h2>
              <div className="space-y-3">
                {readNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 opacity-75"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === 'whatsapp' ? 'bg-gray-100' : 'bg-gray-100'
                      }`}>
                        {notification.type === 'whatsapp' ? (
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notification.sender && (
                          <p className="text-xs text-gray-400 mb-1">{notification.sender}</p>
                        )}
                        <p className="text-sm text-gray-600 leading-5 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{formatTime(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Integration Info */}
          <div className="mt-8 bg-green-50 p-4 rounded-2xl border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Integrasi WhatsApp</h3>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Dapatkan dukungan langsung melalui WhatsApp untuk membantu perjalanan berhenti merokok Anda.
            </p>
            <Button className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
              Hubungkan WhatsApp
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationPage;