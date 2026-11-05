import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, User, Users, Calendar as CalendarIcon, ArrowLeft, Hourglass, X, History, Lock } from 'lucide-react';
import { civitasData, Gender } from '../data/civitas';
import { schedules, Schedule, getActiveKajianSession, ActiveSessionResult } from '../data/schedules';
import { useAttendanceStore, useSettingsStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export default function Presensi() {
  const navigate = useNavigate();
  const { addRecord, records } = useAttendanceStore();
  const { isKajianOpen } = useSettingsStore();
  
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedCivitasId, setSelectedCivitasId] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSessionResult>(() => getActiveKajianSession());
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [showLupaModal, setShowLupaModal] = useState(false);
  
  const [lupaCivitasId, setLupaCivitasId] = useState('');
  const [lupaDate, setLupaDate] = useState('');
  const [lupaScheduleId, setLupaScheduleId] = useState('');
  const [isLupaSuccess, setIsLupaSuccess] = useState(false);

  // Periodically refresh active session (catches 17:30 cutoff automatically)
  useEffect(() => {
    const updateSession = () => {
      setActiveSession(getActiveKajianSession());
    };
    updateSession();
    const interval = setInterval(updateSession, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const currentSchedule = activeSession.schedule;
  const sessionDateStr = activeSession.sessionDateStr;
  const todayCalendarStr = format(new Date(), 'yyyy-MM-dd');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCivitasId || !currentSchedule || !activeSession.isOpen || !sessionDateStr) return;

    addRecord({
      civitasId: selectedCivitasId,
      scheduleId: currentSchedule.id,
      date: sessionDateStr,
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

  // Check if they already attended this active session
  const hasAttendedToday = selectedCivitasId && sessionDateStr && currentSchedule
    ? records.some(r => r.civitasId === selectedCivitasId && r.date === sessionDateStr && r.scheduleId === currentSchedule.id)
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
            <h1 className="text-3xl font-bold text-slate-800">Form Presensi Kajian</h1>
            <p className="text-slate-500 mt-2">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
          </div>

          {!isKajianOpen ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                <Lock className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                Kajian {currentSchedule ? currentSchedule.ustadz : 'Hari Ini'}
              </h3>
              <div className="inline-block bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full font-semibold text-sm mb-6">
                Libur
              </div>
              
              <div className="space-y-3 text-slate-600 max-w-md mx-auto">
                <p className="leading-relaxed">
                  InsyaaAllah kajian akan kembali dilaksanakan pada pertemuan selanjutnya.
                </p>
                <p className="leading-relaxed font-medium italic text-emerald-700">
                  Baarakallah fiikum, semoga Allah mudahkan.
                </p>
              </div>
            </div>
          ) : !activeSession.isOpen || !currentSchedule ? (
            <div className="bg-amber-50 text-amber-900 p-6 sm:p-8 rounded-2xl border border-amber-200 text-center space-y-4">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <Hourglass size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-950">Presensi Kajian Saat Ini Ditutup</h3>
                <p className="mt-2 text-sm text-amber-800 leading-relaxed max-w-md mx-auto">
                  Jadwal penutupan presensi setiap sesi kajian adalah <strong>setiap pukul 17:30 WIB</strong> (bukan pukul 00:00 tengah malam).
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Presensi sesi kajian rutin berikutnya akan dibuka pada hari <strong>Senin pukul 17:30 WIB</strong>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLupaModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <History size={16} />
                  <span>Ajukan Lupa Presensi Sesi Sebelumnya</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Schedule Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                      Sesi Kajian {currentSchedule.dayName}
                    </span>
                    <span className="text-xs font-medium text-emerald-800">
                      {activeSession.sessionDate ? format(activeSession.sessionDate, 'dd MMMM yyyy', { locale: id }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    <Hourglass size={13} className="text-rose-600 shrink-0" />
                    <span>Ditutup: {activeSession.closingTimeStr}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div>
                    <span className="text-emerald-950 font-bold text-lg block">{currentSchedule.ustadz}</span>
                    <span className="text-emerald-700 font-medium text-sm">{currentSchedule.kitab}</span>
                  </div>
                  <div className="flex items-center text-emerald-800 bg-white/80 border border-emerald-200 px-3 py-1.5 rounded-xl w-fit text-xs font-semibold">
                    <CalendarIcon size={15} className="mr-1.5 text-emerald-600" />
                    Mulai {currentSchedule.time} Ba'da Magrib
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
                  max={todayCalendarStr}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jadwal Kajian yang Dihadiri</label>
                <select
                  value={lupaScheduleId}
                  onChange={(e) => setLupaScheduleId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-white"
                  required
                >
                  <option value="">-- Pilih Jadwal Kajian --</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>{s.dayName} - {s.ustadz} ({s.kitab})</option>
                  ))}
                </select>
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
