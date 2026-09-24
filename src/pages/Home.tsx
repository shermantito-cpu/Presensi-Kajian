import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, ScrollText, Settings, Info, X, LayoutDashboard, BookOpen, Quote } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showJadwalModal, setShowJadwalModal] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);

  const showDevToast = () => {
    setToastMessage("Fitur ini masih dalam tahap pengembangan.");
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-50">
          <Info size={18} className="text-blue-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition-colors ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-4xl w-full">
        {/* Header Section */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/logp.png" alt="Logo Ponpes Al-Madina" className="h-28 w-auto drop-shadow-sm" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
            Portal Informasi & Presensi
          </h1>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Menu 1: Kajian Rutin Civitas */}
          <div
            className={cn(
              "group relative overflow-hidden flex flex-col p-8 text-left transition-all duration-300",
              "bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-110 group-hover:shadow-emerald-100 transition-all duration-300">
                <Users size={32} strokeWidth={1.5} className="text-emerald-600 drop-shadow-sm" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowJadwalModal(true); }}
                className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-full transition-colors z-10 flex items-center shadow-sm border border-emerald-100"
              >
                Lihat Jadwal
              </button>
            </div>
            <div onClick={() => navigate('/presensi')} className="cursor-pointer flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">Kajian Rutin Civitas</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sistem Presensi Kajian khusus untuk Civitas, Guru, & Pegawai Ponpes Al-Madina Prabumulih.
              </p>
            </div>
          </div>

          {/* Menu 2: Kajian Khusus Guru */}
          <div
            className={cn(
              "group relative overflow-hidden flex flex-col p-8 text-left transition-all duration-300",
              "bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-110 group-hover:shadow-blue-100 transition-all duration-300">
                <GraduationCap size={32} strokeWidth={1.5} className="text-blue-600 drop-shadow-sm" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); showDevToast(); }}
                  className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors z-10 flex items-center shadow-sm border border-blue-100"
                >
                  Lihat Jadwal
                </button>
              </div>
            </div>
            <div onClick={() => navigate('/presensi-khusus')} className="cursor-pointer flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">Kajian Khusus Guru/Civitas</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sistem presensi kajian khusus Guru/Civitas (Sabtu, 19 September 2026).
              </p>
            </div>
          </div>

          {/* Menu 3: Kajian Dauroh */}
          <div
            className={cn(
              "group relative overflow-hidden flex flex-col p-8 text-left transition-all duration-300",
              "bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm group-hover:scale-110 group-hover:shadow-amber-100 transition-all duration-300">
                <ScrollText size={32} strokeWidth={1.5} className="text-amber-600 drop-shadow-sm" />
              </div>
            </div>
            <div onClick={showDevToast} className="cursor-pointer flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-amber-700 transition-colors">Kajian Dauroh</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sistem presensi untuk kegiatan Dauroh (Dalam tahap pengembangan).
              </p>
            </div>
          </div>

          {/* Menu 4: Dasbor Admin */}
          <div
            onClick={() => navigate('/login')}
            className={cn(
              "cursor-pointer group relative overflow-hidden flex flex-col p-8 text-left transition-all duration-300",
              "bg-slate-800 rounded-3xl border border-slate-700 shadow-md hover:shadow-lg hover:bg-slate-900 hover:-translate-y-1"
            )}
          >
            <div className="bg-gradient-to-br from-slate-700 to-slate-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-slate-600 shadow-inner group-hover:scale-110 group-hover:shadow-slate-700 transition-all duration-300">
              <LayoutDashboard size={32} strokeWidth={1.5} className="text-slate-100 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Dasbor Admin</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Rekap data presensi Civitas Pondok Pesantren Al-Madina Prabumulih.
              </p>
            </div>
          </div>

          {/* Menu 5: Pengingat */}
          <div
            onClick={() => setShowReminderModal(true)}
            className={cn(
              "md:col-span-2 cursor-pointer group relative overflow-hidden flex flex-col md:flex-row items-center p-6 md:p-8 text-left transition-all duration-300",
              "bg-gradient-to-r from-rose-50 to-orange-50 rounded-3xl border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300"
            )}
          >
            <div className="bg-gradient-to-br from-rose-100 to-rose-200/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-rose-200 shadow-sm group-hover:scale-110 group-hover:shadow-rose-200 transition-all duration-300 md:mr-6 mb-4 md:mb-0 shrink-0">
              <BookOpen size={32} strokeWidth={1.5} className="text-rose-600 drop-shadow-sm" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-rose-900 mb-2 group-hover:text-rose-700 transition-colors">Dampak Meninggalkan Majelis Ilmu</h3>
              <p className="text-rose-700/80 text-sm leading-relaxed max-w-2xl">
                Semoga Allah Mudahkan Langkah Kita Menuju Kebaikan. Aaamiin
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:ml-6 shrink-0 w-full md:w-auto flex justify-center md:justify-end">
              <span className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-rose-600 px-6 py-3 rounded-full shadow-sm border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                <BookOpen size={16} />
                Pengingat
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Jadwal Modal Overlay */}
      {showJadwalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white p-2 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setShowJadwalModal(false)}
              className="absolute -top-4 -right-4 bg-white text-slate-800 p-2.5 rounded-full shadow-lg hover:bg-slate-100 hover:text-rose-600 transition-colors z-10 border border-slate-200"
            >
              <X size={20} />
            </button>
            <div className="overflow-auto rounded-2xl flex-1 bg-slate-100 flex items-center justify-center">
              <img src="/jadwal.jpeg" alt="Jadwal Kajian Al-Madina" className="max-w-full h-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal Overlay */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            
            {/* Elegant Header */}
            <div className="relative pt-10 pb-8 px-6 md:px-10 text-center bg-gradient-to-b from-rose-50/80 to-white">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400"></div>
              
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-100 to-orange-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-rose-200/50 rotate-3">
                <BookOpen size={36} className="text-rose-600 -rotate-3" strokeWidth={1.5} />
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                Dampak Meninggalkan <br className="md:hidden" />
                <span className="text-rose-600 relative whitespace-nowrap">
                  Majelis Ilmu
                  <svg className="absolute -bottom-2 left-0 w-full text-rose-200/70" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="transparent"/></svg>
                </span>
              </h2>
            </div>

            <button 
              onClick={() => setShowReminderModal(false)}
              className="absolute top-4 right-4 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 p-2.5 rounded-full transition-colors z-20"
            >
              <X size={20} />
            </button>
            
            <div className="px-6 md:px-10 pb-8 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100 relative group transition-colors hover:bg-slate-100/50">
                  <div className="absolute top-6 right-6 text-slate-200 group-hover:text-rose-100 transition-colors">
                    <Quote size={64} className="rotate-180 opacity-50" />
                  </div>
                  
                  <div className="relative z-10">
                    <p className="text-slate-700 leading-relaxed text-base md:text-lg italic mb-6">
                      "Jika seseorang tidak menghadiri majelis ilmu, tidak pernah mendengar khutbah, dan tidak pernah perhatian dengan apa yang dinukil oleh para ulama, maka akan semakin bertambah kelalaiannya, dan boleh jadi hatinya mengeras hingga membatu, sehingga ia termasuk orang-orang yang lalai."
                    </p>
                    
                    <div className="mt-6 pt-5 border-t border-slate-200/60">
                      <p className="font-bold text-slate-800 text-sm md:text-base">
                        Syaikh Abdul Aziz bin 'Abdillah bin Baz rahimahullah
                      </p>
                      <p className="text-slate-500 text-sm mt-0.5">
                        Mufti Kerajaan Saudi Arabia di masa silam
                      </p>
                      <p className="text-slate-400 text-xs md:text-sm mt-2 italic font-medium">
                        (Majmu' Fatawa Ibnu Baz, 12: 324)
                      </p>
                      <a 
                        href="https://rumaysho.com/15252-akibat-meninggalkan-ngaji-tholabul-ilmi.html" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block mt-4 text-xs md:text-sm text-rose-600 hover:text-rose-700 underline underline-offset-4 font-medium"
                      >
                        Sumber: rumaysho.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <div className="inline-block bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-medium italic text-sm md:text-base border border-emerald-100/50">
                  "Baarakallahu Fiikum, semoga Allah mudahkan langkah kita."
                </div>
              </div>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setShowReminderModal(false)}
                  className="w-full md:w-auto bg-slate-900 hover:bg-rose-600 text-white px-10 py-3.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Tutup Pengingat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom simple book icon since we replaced the lucide one with a manual SVG for the hero
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
