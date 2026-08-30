import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, User, Users, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
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
    });
    
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedCivitasId('');
    }, 3000);
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
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
