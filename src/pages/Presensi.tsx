import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, User, Users, Calendar as CalendarIcon, ArrowLeft, BellRing, Hourglass, CalendarClock, X, History } from 'lucide-react';
import { civitasData, Gender } from '../data/civitas';
import { schedules, Schedule } from '../data/schedules';
import { useAttendanceStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export default function Presensi() {
  const navigate = useNavigate();
  const { addRecord, records } = useAttendanceStore();
  
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedCivitasId, setSelectedCivitasId] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [showInfo, setShowInfo] = useState(true);
  const [showLupaModal, setShowLupaModal] = useState(false);
  
  const [lupaCivitasId, setLupaCivitasId] = useState('');
  const [lupaDate, setLupaDate] = useState('');
  const [lupaScheduleId, setLupaScheduleId] = useState('');
  const [isLupaSuccess, setIsLupaSuccess] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...

  useEffect(() => {
    // Find if there is a schedule today
    const schedule = schedules.find(s => s.day === currentDayIndex);
    setCurrentSchedule(schedule || null);
  }, [currentDayIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCivitasId || !currentSchedule) return;

    addRecord({
      civitasId: selectedCivitasId,
      scheduleId: currentSchedule.id,
      date: todayStr,
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

  // Check if they already attended today
  const hasAttendedToday = selectedCivitasId 
    ? records.some(r => r.civitasId === selectedCivitasId && r.date === todayStr && r.scheduleId === currentSchedule?.id)
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

          {!currentSchedule ? (
            <div className="bg-orange-50 text-orange-800 p-6 rounded-xl border border-orange-200 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold">Tidak Ada Kajian Hari Ini</h3>
              <p className="mt-2 text-orange-700/80">Kajian rutin dilaksanakan pada hari Senin hingga Jum'at Ba'da Magrib.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Schedule Info Box */}
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <span className="text-emerald-800 font-semibold text-lg block">{currentSchedule.ustadz}</span>
                  <span className="text-emerald-600 font-medium">{currentSchedule.kitab}</span>
                </div>
                <div className="mt-3 sm:mt-0 flex items-center text-emerald-700 bg-emerald-100/50 px-4 py-2 rounded-lg w-fit">
                  <CalendarIcon size={18} className="mr-2" />
                  {currentSchedule.time}
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
                      <option value="">-- Pilih Nama Anda --</option>
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

      {/* Info Pop Up Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-slate-100">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-6">
              <div className="flex items-center text-emerald-600 mb-2">
                <div className="bg-emerald-100 p-2.5 rounded-xl mr-4 shadow-sm">
                  <BellRing size={24} className="text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Pengingat</h3>
              </div>
              <div className="space-y-4 mt-6">
                <div className="flex items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Hourglass className="shrink-0 text-emerald-500 mt-0.5 mr-3" size={20} />
                  <p className="text-slate-700 leading-relaxed text-sm">Batas Pengisian Presensi Kajian sampai pukul 00.00 WIB.</p>
                </div>
                <div className="flex items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <CalendarClock className="shrink-0 text-emerald-500 mt-0.5 mr-3" size={20} />
                  <p className="text-slate-700 leading-relaxed text-sm">Jika terlupa mengisi presensi atau ingin mengisi presensi pada pekan sebelumnya, silahkan klik tombol Lupa Presensi.</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold py-3 rounded-xl transition-all shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

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
                  max={todayStr}
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
