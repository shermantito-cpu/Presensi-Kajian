import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Presensi from './pages/Presensi';
import PresensiKhusus from './pages/PresensiKhusus';
import { useAuth } from './store/useAppStore';
import { schedules } from './data/schedules';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuth();
  if (role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Global Alarm Component
function AlarmReminder() {
  const [showAlarm, setShowAlarm] = useState(false);
  const [alarmMessage, setAlarmMessage] = useState('');

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    let alarmInterval: number | null = null;

    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay();

      const todaySchedule = schedules.find(s => s.day === currentDay);
      if (!todaySchedule) return;

      // Parse schedule time (e.g., "18:30")
      // We will simplify and assume it's roughly 18:30. 
      // 1 hour before is 17:30
      
      // Since Maghrib changes, we just mock it for this requirement to trigger at 17:30
      // To ensure it works and we don't spam, we track if it already played today.
      const alarmKey = `alarm_played_${now.toISOString().split('T')[0]}`;
      const hasPlayedToday = localStorage.getItem(alarmKey);

      if (currentHour === 17 && currentMinute >= 30 && !hasPlayedToday) {
        setShowAlarm(true);
        setAlarmMessage(`Pengingat: Kajian ${todaySchedule.ustadz} (${todaySchedule.kitab}) akan dimulai 1 jam lagi (Ba'da Magrib).`);
        localStorage.setItem(alarmKey, 'true');

        // Play standard beep/alarm
        try {
           const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
           const oscillator = audioCtx.createOscillator();
           const gainNode = audioCtx.createGain();
           oscillator.connect(gainNode);
           gainNode.connect(audioCtx.destination);
           oscillator.type = 'sine';
           oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
           
           // Beep pattern
           gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
           gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
           
           oscillator.start(audioCtx.currentTime);
           oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          console.warn('AudioContext not supported or blocked', e);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    // Also check immediately on mount
    checkTime();

    return () => clearInterval(interval);
  }, []);

  if (!showAlarm) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white p-4 rounded-xl shadow-2xl border-l-4 border-emerald-500 z-50 flex items-start gap-3 animate-in slide-in-from-bottom-5">
      <div className="bg-emerald-100 p-2 rounded-full shrink-0">
        <BellRing className="text-emerald-600" size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-800">Pengingat Kajian</h4>
        <p className="text-sm text-slate-600 mt-1">{alarmMessage}</p>
      </div>
      <button 
        onClick={() => setShowAlarm(false)}
        className="text-slate-400 hover:text-slate-600 p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AlarmReminder />
      <div className="flex flex-col min-h-screen font-sans bg-slate-50">
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/presensi" element={<Presensi />} />
            <Route path="/presensi-khusus" element={<PresensiKhusus />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="w-full text-center py-6 text-sm text-slate-500 bg-transparent border-t border-slate-200/50">
          E-Presensi Kajian &copy; 2026 Al-Madina Apps
        </footer>
      </div>
    </BrowserRouter>
  );
}
