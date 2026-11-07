import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, User, Users, Calendar as CalendarIcon, ArrowLeft, Hourglass, X, History, Lock } from 'lucide-react';
import { civitasData, Gender } from '../data/civitas';
import { schedules, Schedule } from '../data/schedules';
import { useAttendanceStore, useSettingsStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export default function PresensiKhusus() {
  const navigate = useNavigate();
  const { addRecord, records } = useAttendanceStore();
  const { isKajianOpen } = useSettingsStore();
  
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedCivitasId, setSelectedCivitasId] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [showLupaModal, setShowLupaModal] = useState(false);
  
  const [lupaCivitasId, setLupaCivitasId] = useState('');
  const [lupaDate, setLupaDate] = useState('2026-11-07');
  const [lupaScheduleId, setLupaScheduleId] = useState('khusus_7nov2026');
  const [isLupaSuccess, setIsLupaSuccess] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  
  const khususScheduleId = 'khusus_7nov2026';
  
  const isKhususTimeOpen = () => {
    // 7 November 2026 (Month index 10 in JS: 0=Jan, 10=Nov)
    // Dibuka hari Sabtu, 7 November 2026 pukul 11.30 WIB sampai pukul 00.00 WIB (tertutup otomatis)
    const startDateLocal = new Date(2026, 10, 7, 11, 30, 0);
    const endDateLocal = new Date(2026, 10, 7, 23, 59, 59, 999);
    const isLocalOpen = currentTime >= startDateLocal && currentTime <= endDateLocal;

    let isWibOpen = false;
    try {
      const wibDate = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const startDateWib = new Date(2026, 10, 7, 11, 30, 0);
      const endDateWib = new Date(2026, 10, 7, 23, 59, 59, 999);
      isWibOpen = wibDate >= startDateWib && wibDate <= endDateWib;
    } catch {
      // fallback
    }

    return isLocalOpen || isWibOpen;
  };
  
  const isOpen = isKajianOpen && isKhususTimeOpen();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCivitasId || !isOpen) return;

    addRecord({
      civitasId: selectedCivitasId,
      scheduleId: khususScheduleId,
      date: '2026-11-07',
      status: 'approved',
    });
    
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedCivitasId('');
    }, 3000);
  };
  
  const handleLupaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lupaCivitasId || !lupaDate || !lupaScheduleId) return;

    addRecord({
      civitasId: lupaCivitasId,
      scheduleId: lupaScheduleId,
      date: lupaDate,
      status: 'pending',
    });
    
    setIsLupaSuccess(true);
    setTimeout(() => {
      setIsLupaSuccess(false);
      setShowLupaModal(false);
      setLupaCivitasId('');
      setLupaDate('');
      setLupaScheduleId('');
    }, 2000);
  };

  const filteredCivitas = civitasData.filter(c => c.gender === selectedGender);

  // Check if they already attended this special event
  const hasAttendedToday = selectedCivitasId 
    ? records.some(r => r.civitasId === selectedCivitasId && r.scheduleId === khususScheduleId)
    : false;

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Kembali
        </button>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/logp.png" 
                alt="Logo Ponpes Al-Madina" 
                className="h-20 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Form Presensi Kajian Khusus</h1>
            <p className="text-slate-500 mt-2 font-medium">Sabtu, 7 November 2026</p>
          </div>

          {!isOpen ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                <Lock className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Kajian Khusus Civitas
              </h3>
              <div className="inline-block bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full font-semibold text-sm mb-4">
                Presensi Ditutup / Belum Dibuka
              </div>

              {/* Kajian Detail Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left max-w-lg mx-auto">
                <div className="text-xs uppercase font-bold tracking-wider text-emerald-700 mb-1">Judul Kajian</div>
                <div className="text-lg font-bold text-slate-800 mb-3">Berusaha Menjadi Pegawai Teladan</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 block">Pemateri:</span>
                    <span className="font-semibold text-slate-700">Ustadz Abdurrahman Al-Amiry</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Waktu Pelaksanaan:</span>
                    <span className="font-semibold text-slate-700">Ba'da Zuhur s.d Selesai</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 text-slate-600 max-w-md mx-auto">
                <p className="text-sm leading-relaxed">
                  Presensi kajian khusus ini dibuka pada hari <strong>Sabtu, 7 November 2026</strong> mulai pukul <strong>11.30 WIB</strong> sampai pukul <strong>00.00 WIB</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Schedule Info Box */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Presensi Dibuka: 11.30 - 00.00 WIB
                    </div>
                    <h2 className="text-xl font-bold text-emerald-950">Berusaha Menjadi Pegawai Teladan</h2>
                    <p className="text-emerald-700 font-medium text-sm mt-0.5">
                      Bersama <strong className="text-emerald-900">Ustadz Abdurrahman Al-Amiry</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Kajian Khusus Civitas • Sabtu, 7 November 2026
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-emerald-200/60">
                    <div className="flex items-center text-emerald-800 bg-white/80 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium text-xs shadow-xs">
                      <CalendarIcon size={14} className="mr-1.5 text-emerald-600" />
                      Ba'da Zuhur s.d Selesai
                    </div>
                  </div>
                </div>
              </div>

              {!selectedGender ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-800 mb-4">Pilih Kategori Presensi:</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedGender('Ikhwan')}
                      className="flex flex-col items-center justify-center p-8 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
                    >
                      <User size={48} className="text-blue-600 mb-4" />
                      <span className="text-xl font-bold text-blue-900">Kajian Ikhwan</span>
                    </button>
                    <button
                      onClick={() => setSelectedGender('Akhwat')}
                      className="flex flex-col items-center justify-center p-8 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                    >
                      <Users size={48} className="text-rose-600 mb-4" />
                      <span className="text-xl font-bold text-rose-900">Kajian Akhwat</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-800">
                      Presensi {selectedGender}
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedGender(null);
                        setSelectedCivitasId('');
                      }}
                      className="text-sm text-slate-500 underline"
                    >
                      Ubah Kategori
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Civitas</label>
                    <select
                      value={selectedCivitasId}
                      onChange={(e) => setSelectedCivitasId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Pilih Nama --</option>
                      {filteredCivitas.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {hasAttendedToday && (
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg flex items-start">
                      <CheckCircle2 className="shrink-0 mr-3 mt-0.5" size={20} />
                      <p className="text-sm">Anda sudah melakukan presensi untuk kajian hari ini.</p>
                    </div>
                  )}

                  {isSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center">
                      <CheckCircle2 className="shrink-0 mr-3 text-emerald-600" size={24} />
                      <span className="font-medium">Alhamdulillah, Presensi berhasil dicatat!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedCivitasId || hasAttendedToday || isSuccess}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center"
                  >
                    Hadir Kajian
                  </button>
                  
                  <div className="pt-4 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => setShowLupaModal(true)}
                      className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 hover:border-emerald-200 shadow-sm"
                    >
                      <History size={16} className="mr-2" />
                      Lupa Presensi?
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lupa Presensi Modal */}
      {showLupaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Form Lupa Presensi</h3>
              <button 
                onClick={() => setShowLupaModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLupaSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Civitas</label>
                <select
                  value={lupaCivitasId}
                  onChange={(e) => setLupaCivitasId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-white"
                  required
                >
                  <option value="">-- Pilih Nama Civitas --</option>
                  {civitasData.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Kehadiran</label>
                <input 
                  type="date"
                  value={lupaDate}
                  onChange={(e) => setLupaDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kajian Khusus yang Dihadiri</label>
                <div className="px-4 py-2.5 border border-emerald-200 bg-emerald-50/70 rounded-xl text-sm font-semibold text-emerald-900">
                  Kajian Khusus: Berusaha Menjadi Pegawai Teladan (Sabtu, 7 Nov 2026)
                </div>
              </div>

              {isLupaSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center text-sm">
                  <CheckCircle2 className="shrink-0 mr-2 text-emerald-600" size={18} />
                  <span className="font-medium">Pengajuan presensi manual berhasil dikirim ke Admin.</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLupaModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={!lupaCivitasId || !lupaDate || !lupaScheduleId || isLupaSuccess}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-colors shadow-sm"
                >
                  Ajukan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
