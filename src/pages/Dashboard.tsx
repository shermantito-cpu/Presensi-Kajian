import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  LogOut, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CalendarDays, 
  Pencil, 
  Power, 
  PowerOff,
  UserX,
  CalendarRange,
  ClipboardList
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { civitasData, Gender, Civitas } from '../data/civitas';
import { schedules } from '../data/schedules';
import { useAttendanceStore, useAuth, useSettingsStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import RekapKetidakhadiran from '../components/RekapKetidakhadiran';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { records, removeRecordById, addRecord, updateRecordStatus } = useAttendanceStore();
  const { isKajianOpen, setKajianStatus } = useSettingsStore();
  
  // Main Tab Navigation: Presensi Management vs Rekap Ketidakhadiran
  const [mainTab, setMainTab] = useState<'presensi' | 'ketidakhadiran'>('presensi');

  const [activeTab, setActiveTab] = useState<Gender>('Ikhwan');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'khusus' | 'custom'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const currentDate = new Date();
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(currentDate), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(endOfMonth(currentDate), 'yyyy-MM-dd'));

  const [editingCivitas, setEditingCivitas] = useState<Civitas | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Weekly logic
  const targetWeekDate = subWeeks(currentDate, -weekOffset); // if weekOffset is negative, goes back
  const weekStart = startOfWeek(targetWeekDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(targetWeekDate, { weekStartsOn: 1 });

  // Custom week number relative to July 27, 2026
  const getCustomWeekNumber = (date: Date) => {
    const startDate = new Date(2026, 6, 27); // July 27, 2026 (Month is 0-indexed)
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    currentWeekStart.setHours(0,0,0,0);
    
    const diffTime = currentWeekStart.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return 1 + Math.floor(diffDays / 7);
  };

  // Monthly logic
  const targetMonthDate = subMonths(currentDate, -monthOffset);
  const monthStart = startOfMonth(targetMonthDate);
  const monthEnd = endOfMonth(targetMonthDate);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.status === 'pending') return false;
      
      if (viewMode === 'khusus') {
        return r.scheduleId === 'khusus_19sept2026';
      }
      
      if (viewMode === 'custom') {
        if (!r.date) return false;
        return r.date >= customStartDate && r.date <= customEndDate;
      }

      const d = new Date(r.date);
      if (viewMode === 'weekly') {
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } else {
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }
    });
  }, [records, viewMode, weekStart, weekEnd, monthStart, monthEnd, customStartDate, customEndDate]);
  
  const allPendingRecords = useMemo(() => records.filter(r => r.status === 'pending'), [records]);

  const civitasList = useMemo(() => civitasData.filter(c => c.gender === activeTab), [activeTab]);

  const minRequirement = viewMode === 'monthly' ? 4 : 1;

  const recap = useMemo(() => {
    return civitasList.map(c => {
      const attended = filteredRecords.filter(r => r.civitasId === c.id);
      return {
        ...c,
        attendedCount: attended.length,
        hasMetRequirement: attended.length >= minRequirement,
      };
    });
  }, [civitasList, filteredRecords, minRequirement]);

  const notMetRequirementCount = recap.filter(r => !r.hasMetRequirement).length;

  const downloadReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Laporan Presensi Kajian', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Pondok Pesantren Al-Madina Al-Islami Prabumulih', 14, 24);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    
    if (viewMode === 'weekly') {
      doc.text(`Pekan ke-${getCustomWeekNumber(targetWeekDate)} (${format(weekStart, 'dd MMM yyyy', { locale: id })} - ${format(weekEnd, 'dd MMM yyyy', { locale: id })})`, 14, 30);
    } else if (viewMode === 'monthly') {
      doc.text(`Bulan ${format(monthStart, 'MMMM yyyy', { locale: id })}`, 14, 30);
    } else if (viewMode === 'khusus') {
      doc.text(`Kajian Khusus: Sabtu, 19 September 2026`, 14, 30);
    } else {
      doc.text(`Periode: ${format(new Date(customStartDate), 'dd MMM yyyy', { locale: id })} - ${format(new Date(customEndDate), 'dd MMM yyyy', { locale: id })}`, 14, 30);
    }
    
    const headerTitle = `Status (Min ${minRequirement}x)`;

    // Ikhwan Table
    doc.text('Kajian Ikhwan', 14, 40);
    const ikhwanRecap = civitasData.filter(c => c.gender === 'Ikhwan').map(c => {
      const count = filteredRecords.filter(r => r.civitasId === c.id).length;
      return [c.name, c.employeeType === 'Bagian Umum' ? 'Bagian Umum' : 'Pendidik & PTK', count > 0 ? count.toString() : 'Belum Hadir', count >= minRequirement ? 'Memenuhi' : 'Tidak Memenuhi'];
    });

    autoTable(doc, {
      startY: 44,
      head: [['Nama Civitas', 'Jenis Pegawai', 'Jml Kehadiran', headerTitle]],
      body: ikhwanRecap,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] } // emerald-700
    });

    // Akhwat Table
    doc.text('Kajian Akhwat', 14, (doc as any).lastAutoTable.finalY + 14);
    const akhwatRecap = civitasData.filter(c => c.gender === 'Akhwat').map(c => {
      const count = filteredRecords.filter(r => r.civitasId === c.id).length;
      return [c.name, c.employeeType === 'Bagian Umum' ? 'Bagian Umum' : 'Pendidik & PTK', count > 0 ? count.toString() : 'Belum Hadir', count >= minRequirement ? 'Memenuhi' : 'Tidak Memenuhi'];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Nama Civitas', 'Jenis Pegawai', 'Jml Kehadiran', headerTitle]],
      body: akhwatRecap,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] }
    });

    const reportDateStr = viewMode === 'weekly' 
      ? format(weekStart, 'dd-MM-yyyy') 
      : viewMode === 'monthly' 
      ? format(monthStart, 'dd-MM-yyyy') 
      : customStartDate;
    doc.save(`Laporan_Kajian_${viewMode}_${reportDateStr}.pdf`);
  };

  const existingRecord = useMemo(() => {
    if (!editingCivitas || !editDate || !editScheduleId) return null;
    return records.find(r => r.civitasId === editingCivitas.id && r.date === editDate && r.scheduleId === editScheduleId);
  }, [records, editingCivitas, editDate, editScheduleId]);

  const civitasRecords = useMemo(() => {
    if (!editingCivitas) return [];
    return filteredRecords.filter(r => r.civitasId === editingCivitas.id);
  }, [filteredRecords, editingCivitas]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
              <img 
                src="/logp.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">Admin Dasbor</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Presensi Kajian Ponpes Al-Madina</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Toggle Kajian Status */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">Status Akses Presensi</h3>
            <p className="text-sm text-slate-500 mt-0.5">Kontrol apakah form presensi saat ini dibuka untuk santri/civitas atau diliburkan.</p>
          </div>
          <button
            onClick={() => setKajianStatus(!isKajianOpen)}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center transition-all shadow-sm shrink-0 ${
              isKajianOpen 
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isKajianOpen ? <PowerOff size={18} className="mr-2" /> : <Power size={18} className="mr-2" />}
            {isKajianOpen ? 'Tutup Presensi (Libur)' : 'Buka Presensi (Aktif)'}
          </button>
        </div>

        {/* Tab Navigasi Utama: Presensi vs Rekap Ketidakhadiran */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setMainTab('presensi')}
            className={cn(
              "flex items-center gap-2 pb-3 px-3 sm:px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap",
              mainTab === 'presensi'
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <ClipboardList size={18} />
            <span>Manajemen Presensi</span>
            {allPendingRecords.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {allPendingRecords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab('ketidakhadiran')}
            className={cn(
              "flex items-center gap-2 pb-3 px-3 sm:px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap",
              mainTab === 'ketidakhadiran'
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <UserX size={18} />
            <span>Rekap Ketidakhadiran</span>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Baru
            </span>
          </button>
        </div>

        {/* TAB 1: MANAJEMEN PRESENSI */}
        {mainTab === 'presensi' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-wrap w-fit">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", viewMode === 'weekly' ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-600 hover:bg-slate-50")}
                >
                  Mingguan
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", viewMode === 'monthly' ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-600 hover:bg-slate-50")}
                >
                  <CalendarDays size={16} /> Bulanan
                </button>
                <button
                  onClick={() => setViewMode('khusus')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", viewMode === 'khusus' ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-600 hover:bg-slate-50")}
                >
                  Kajian Khusus
                </button>
                <button
                  onClick={() => setViewMode('custom')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", viewMode === 'custom' ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-600 hover:bg-slate-50")}
                >
                  <CalendarRange size={16} /> Kustom Tanggal
                </button>
              </div>

              <div className="flex items-center">
                <button 
                  onClick={downloadReport}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto"
                >
                  <Download size={18} />
                  <span>Unduh PDF Presensi</span>
                </button>
              </div>
            </div>

            {/* Filter Date Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {viewMode === 'weekly' ? (
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
                  <button 
                    onClick={() => setWeekOffset(prev => prev - 1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                    title="Pekan Sebelumnya"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-center px-4 min-w-[150px]">
                    <span className="block text-sm font-semibold text-slate-700">Pekan ke-{getCustomWeekNumber(targetWeekDate)}</span>
                    <span className="block text-xs text-slate-500">
                      {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <button 
                    onClick={() => setWeekOffset(prev => prev + 1)}
                    disabled={weekOffset >= 0}
                    className={cn("p-2 rounded-lg text-slate-600", weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-100")}
                    title="Pekan Berikutnya"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : viewMode === 'monthly' ? (
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
                  <button 
                    onClick={() => setMonthOffset(prev => prev - 1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-center px-4 min-w-[150px]">
                    <span className="block text-sm font-semibold text-slate-700">{format(monthStart, 'MMMM yyyy', { locale: id })}</span>
                  </div>
                  <button 
                    onClick={() => setMonthOffset(prev => prev + 1)}
                    disabled={monthOffset >= 0}
                    className={cn("p-2 rounded-lg text-slate-600", monthOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-100")}
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : viewMode === 'khusus' ? (
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
                  <div className="text-center px-4 min-w-[150px] py-1.5">
                    <span className="block text-sm font-semibold text-slate-700">Kajian Khusus</span>
                    <span className="block text-xs text-slate-500">Sabtu, 19 Sept 2026</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Dari:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Sampai:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Warning notification if current period has people who haven't attended */}
            {((viewMode === 'weekly' && weekOffset === 0) || (viewMode === 'monthly' && monthOffset === 0) || viewMode === 'khusus') && notMetRequirementCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-amber-800 font-semibold">Perhatian {viewMode === 'weekly' ? 'Pekan' : viewMode === 'monthly' ? 'Bulan' : 'Kajian'} Ini</h4>
                  <p className="text-amber-700/80 text-sm mt-1">
                    Terdapat <strong>{notMetRequirementCount} civitas</strong> di kategori {activeTab} yang belum memenuhi standar kehadiran {viewMode === 'weekly' ? 'pekan ini' : viewMode === 'monthly' ? 'bulan ini' : 'kajian khusus'} (Minimal {minRequirement} kali).
                  </p>
                </div>
              </div>
            )}

            {/* Pengajuan Presensi Manual (Pending) */}
            {allPendingRecords.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-blue-100/50 border-b border-blue-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Pengajuan Presensi Manual</h3>
                    <p className="text-xs text-blue-700 mt-1">Menunggu persetujuan Admin ({allPendingRecords.length} pengajuan)</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-blue-50/50 border-b border-blue-200">
                        <th className="px-6 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">Nama Civitas</th>
                        <th className="px-6 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">Tanggal & Jadwal</th>
                        <th className="px-6 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {allPendingRecords.map(record => {
                        const civitas = civitasData.find(c => c.id === record.civitasId);
                        const schedule = schedules.find(s => s.id === record.scheduleId);
                        if (!civitas) return null;
                        return (
                          <tr key={record.id} className="hover:bg-blue-100/30">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-800 text-sm">{civitas.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{civitas.gender}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-700">{format(new Date(record.date), "dd MMM yyyy", { locale: id })}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{schedule ? `${schedule.dayName} - ${schedule.ustadz}` : '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    if (record.id) removeRecordById(record.id);
                                  }}
                                  className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  Tolak
                                </button>
                                <button 
                                  onClick={() => {
                                    if (record.id) updateRecordStatus(record.id, 'approved');
                                  }}
                                  className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                  Setujui (Hadir)
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200">
                {(['Ikhwan', 'Akhwat'] as Gender[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-4 text-center font-semibold text-sm transition-colors relative",
                      activeTab === tab ? "text-emerald-700" : "text-slate-500 hover:text-slate-700 bg-slate-50"
                    )}
                  >
                    Kajian {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                    )}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Civitas</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                        Kehadiran ({viewMode === 'weekly' ? 'Pekan Ini' : viewMode === 'monthly' ? 'Bulan Ini' : viewMode === 'khusus' ? 'Khusus' : 'Periode Kustom'})
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status (Min {minRequirement}x)</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recap.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-800">{r.name}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold border",
                              r.employeeType === 'Bagian Umum'
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            )}>
                              {r.employeeType === 'Bagian Umum' ? 'Bagian Umum' : 'Pendidik & PTK'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            r.attendedCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          )}>
                            {r.attendedCount}x Hadir
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {r.hasMetRequirement ? (
                              <div className="flex items-center text-emerald-600 text-sm font-medium">
                                <CheckCircle2 size={16} className="mr-1.5" /> Terpenuhi
                              </div>
                            ) : (
                              <div className="flex items-center text-rose-500 text-sm font-medium">
                                <X size={16} className="mr-1.5" /> Belum Hadir
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setEditingCivitas(r);
                              if (viewMode === 'khusus') {
                                setEditScheduleId('khusus_19sept2026');
                                setEditDate('2026-09-19');
                              } else {
                                setEditScheduleId(schedules[0].id);
                                setEditDate(format(new Date(), 'yyyy-MM-dd'));
                              }
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors inline-flex"
                            title="Edit Status Kehadiran"
                          >
                            <Pencil size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REKAP KETIDAKHADIRAN */}
        {mainTab === 'ketidakhadiran' && (
          <RekapKetidakhadiran 
            records={records} 
            onOpenEditCivitas={(civitas) => {
              setEditingCivitas(civitas);
              setEditScheduleId(schedules[0].id);
              setEditDate(format(new Date(), 'yyyy-MM-dd'));
            }}
          />
        )}

      </main>

      {/* Edit Modal */}
      {editingCivitas && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Edit Status Kehadiran</h3>
              <button onClick={() => setEditingCivitas(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Civitas</label>
                <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium">
                  {editingCivitas.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Kehadiran</label>
                <input 
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jadwal Kajian yang Dihadiri</label>
                <select
                  value={editScheduleId}
                  onChange={(e) => setEditScheduleId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-white"
                >
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>{s.dayName} - {s.ustadz} ({s.kitab})</option>
                  ))}
                  <option value="khusus_19sept2026">Kajian Khusus Guru/Civitas (Sabtu, 19 Sept)</option>
                </select>
              </div>
              
              {existingRecord && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Civitas ini sudah tercatat <strong>Hadir</strong> pada jadwal ini.
                </div>
              )}
              {civitasRecords.length > 0 && !existingRecord && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                  Civitas ini memiliki <strong>{civitasRecords.length}</strong> catatan kehadiran pada periode ini. Klik "Batalkan Kehadiran" di bawah untuk menghapusnya.
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between gap-3 bg-slate-50">
              <button 
                onClick={async () => {
                  if (existingRecord) {
                    await removeRecordById(existingRecord.id);
                    setEditingCivitas(null);
                  } else if (civitasRecords.length > 0) {
                    // Delete all records in the current view
                    for (const rec of civitasRecords) {
                      await removeRecordById(rec.id);
                    }
                    setEditingCivitas(null);
                  } else {
                    alert('Civitas ini belum memiliki data kehadiran pada periode ini.');
                  }
                }}
                className="px-5 py-2.5 text-sm font-medium text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-colors border border-rose-200 hover:border-rose-600 shadow-sm"
              >
                Batalkan Kehadiran
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingCivitas(null)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button 
                  onClick={async () => {
                    if (!editDate || !editScheduleId) return;
                    if (existingRecord) {
                      alert('Civitas ini sudah tercatat hadir pada jadwal ini.');
                      return;
                    }
                    await addRecord({
                      civitasId: editingCivitas.id,
                      scheduleId: editScheduleId,
                      date: editDate
                    });
                    setEditingCivitas(null);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                >
                  Simpan Kehadiran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
