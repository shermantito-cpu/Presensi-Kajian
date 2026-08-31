import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks, getISOWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { LogOut, Download, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X, Trash2, CalendarDays, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { civitasData, Gender } from '../data/civitas';
import { schedules } from '../data/schedules';
import { useAttendanceStore, useAuth } from '../store/useAppStore';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { records, removeRecordById, addRecord, updateRecordStatus } = useAttendanceStore();
  
  const [activeTab, setActiveTab] = useState<Gender>('Ikhwan');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [editingCivitas, setEditingCivitas] = useState<typeof civitasData[0] | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, viewMode, weekOffset, monthOffset]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentDate = new Date();
  
  // Weekly logic
  const targetWeekDate = subWeeks(currentDate, -weekOffset); // if weekOffset is negative, goes back
  const weekStart = startOfWeek(targetWeekDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(targetWeekDate, { weekStartsOn: 1 });

  // Monthly logic
  const targetMonthDate = subMonths(currentDate, -monthOffset);
  const monthStart = startOfMonth(targetMonthDate);
  const monthEnd = endOfMonth(targetMonthDate);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.status === 'pending') return false;
      const d = new Date(r.date);
      if (viewMode === 'weekly') {
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } else {
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }
    });
  }, [records, viewMode, weekStart, weekEnd, monthStart, monthEnd]);
  
  const allPendingRecords = useMemo(() => records.filter(r => r.status === 'pending'), [records]);

  const civitasList = useMemo(() => civitasData.filter(c => c.gender === activeTab), [activeTab]);

  const minRequirement = viewMode === 'weekly' ? 1 : 4;

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
    doc.text('Laporan Presensi Kajian', 14, 20);
    doc.setFontSize(12);
    
    if (viewMode === 'weekly') {
      doc.text(`Pekan ke-${getISOWeek(targetWeekDate)} (${format(weekStart, 'dd MMM yyyy', { locale: id })} - ${format(weekEnd, 'dd MMM yyyy', { locale: id })})`, 14, 28);
    } else {
      doc.text(`Bulan ${format(monthStart, 'MMMM yyyy', { locale: id })}`, 14, 28);
    }
    
    const headerTitle = `Status (Min ${minRequirement}x)`;

    // Ikhwan Table
    doc.text('Kajian Ikhwan', 14, 38);
    const ikhwanRecap = civitasData.filter(c => c.gender === 'Ikhwan').map(c => {
      const count = filteredRecords.filter(r => r.civitasId === c.id).length;
      return [c.name, count > 0 ? count.toString() : 'Belum Hadir', count >= minRequirement ? 'Memenuhi' : 'Tidak Memenuhi'];
    });

    autoTable(doc, {
      startY: 42,
      head: [['Nama Civitas', 'Jml Kehadiran', headerTitle]],
      body: ikhwanRecap,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] } // emerald-700
    });

    // Akhwat Table
    doc.text('Kajian Akhwat', 14, (doc as any).lastAutoTable.finalY + 14);
    const akhwatRecap = civitasData.filter(c => c.gender === 'Akhwat').map(c => {
      const count = filteredRecords.filter(r => r.civitasId === c.id).length;
      return [c.name, count > 0 ? count.toString() : 'Belum Hadir', count >= minRequirement ? 'Memenuhi' : 'Tidak Memenuhi'];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Nama Civitas', 'Jml Kehadiran', headerTitle]],
      body: akhwatRecap,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] }
    });

    doc.save(`Laporan_Kajian_${viewMode}_${format(viewMode === 'weekly' ? weekStart : monthStart, 'dd-MM-yyyy')}.pdf`);
  };

  const historyRecords = useMemo(() => {
    return filteredRecords
      .filter(r => civitasList.some(c => c.id === r.civitasId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredRecords, civitasList]);

  const totalPages = Math.max(1, Math.ceil(historyRecords.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentRecords = historyRecords.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                <img 
                  src="/logp.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>
            <h1 className="font-bold text-slate-800 text-lg sm:text-xl">Admin Dasbor</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-fit">
            <button
              onClick={() => setViewMode('weekly')}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", viewMode === 'weekly' ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-50")}
            >
              Mingguan
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", viewMode === 'monthly' ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-50")}
            >
              <CalendarDays size={16} /> Bulanan
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {viewMode === 'weekly' ? (
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center px-4 min-w-[150px]">
                <span className="block text-sm font-semibold text-slate-700">Pekan ke-{getISOWeek(targetWeekDate)}</span>
                <span className="block text-xs text-slate-500">
                  {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                </span>
              </div>
              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                disabled={weekOffset >= 0}
                className={cn("p-2 rounded-lg text-slate-600", weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-100")}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-fit">
              <button 
                onClick={() => setMonthOffset(prev => prev - 1)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
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
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 items-end">
            <button 
              onClick={downloadReport}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Unduh PDF {viewMode === 'weekly' ? 'Pekan Ini' : 'Bulan Ini'}</span>
            </button>
          </div>
        </div>

        {/* Warning notification if current week has people who haven't attended */}
        {((viewMode === 'weekly' && weekOffset === 0) || (viewMode === 'monthly' && monthOffset === 0)) && notMetRequirementCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-amber-800 font-semibold">Perhatian {viewMode === 'weekly' ? 'Pekan' : 'Bulan'} Ini</h4>
              <p className="text-amber-700/80 text-sm mt-1">
                Terdapat <strong>{notMetRequirementCount} civitas</strong> di kategori {activeTab} yang belum memenuhi standar kehadiran {viewMode === 'weekly' ? 'pekan' : 'bulan'} ini (Minimal {minRequirement} kali).
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
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Kehadiran ({viewMode === 'weekly' ? 'Pekan' : 'Bulan'} Ini)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status (Min {minRequirement}x)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recap.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
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
                          setEditScheduleId(schedules[0].id);
                          setEditDate(format(new Date(), 'yyyy-MM-dd'));
                        }}
                        className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors inline-flex"
                        title="Tambah Kehadiran Manual"
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

      </main>

      {/* Edit Modal */}
      {editingCivitas && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Ubah Status Menjadi Hadir</h3>
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
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setEditingCivitas(null)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  if (!editDate || !editScheduleId) return;
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
      )}
    </div>
  );
}
