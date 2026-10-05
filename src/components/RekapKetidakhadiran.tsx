import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subMonths,
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Users, 
  UserX, 
  UserCheck, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarRange,
  XCircle,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { civitasData, Gender, Civitas } from '../data/civitas';
import { schedules } from '../data/schedules';
import { AttendanceRecord } from '../types';
import { cn } from '../lib/utils';

interface RekapKetidakhadiranProps {
  records: AttendanceRecord[];
  onOpenEditCivitas?: (civitas: Civitas) => void;
}

type PeriodPreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'all_time' | 'custom';
type SessionBasis = 'recorded' | 'scheduled' | 'custom';

export default function RekapKetidakhadiran({ records, onOpenEditCivitas }: RekapKetidakhadiranProps) {
  const today = new Date();
  
  // Date preset state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [startDateStr, setStartDateStr] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDateStr, setEndDateStr] = useState<string>(format(endOfMonth(today), 'yyyy-MM-dd'));

  // Session basis state
  const [sessionBasis, setSessionBasis] = useState<SessionBasis>('recorded');
  const [customSessionCount, setCustomSessionCount] = useState<number>(4);

  // Filters & Sorting state
  const [selectedGender, setSelectedGender] = useState<'All' | Gender>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'absent' | 'attended' | 'name' | 'rate'>('absent');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'high_absence' | 'medium_absence' | 'perfect'>('all');

  // Modal detail civitas
  const [selectedCivitasDetail, setSelectedCivitasDetail] = useState<{
    civitas: Civitas;
    attendedRecords: AttendanceRecord[];
    attendedCount: number;
    absentCount: number;
    totalSessions: number;
    absenceRate: number;
  } | null>(null);

  // Handle Preset Changes
  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'this_week': {
        const s = startOfWeek(now, { weekStartsOn: 1 });
        const e = endOfWeek(now, { weekStartsOn: 1 });
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'last_week': {
        const lastWeekDate = subDays(now, 7);
        const s = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
        const e = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'this_month': {
        const s = startOfMonth(now);
        const e = endOfMonth(now);
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'last_month': {
        const lastMonthDate = subMonths(now, 1);
        const s = startOfMonth(lastMonthDate);
        const e = endOfMonth(lastMonthDate);
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(e, 'yyyy-MM-dd'));
        break;
      }
      case 'last_30_days': {
        const s = subDays(now, 30);
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(now, 'yyyy-MM-dd'));
        break;
      }
      case 'all_time': {
        // Earliest known date in app (July 2026 or minimum date in records)
        let minDate = '2026-07-01';
        if (records.length > 0) {
          const dates = records.map(r => r.date).filter(Boolean).sort();
          if (dates.length > 0 && dates[0] < minDate) {
            minDate = dates[0];
          }
        }
        setStartDateStr(minDate);
        setEndDateStr(format(now, 'yyyy-MM-dd'));
        break;
      }
      case 'custom':
      default:
        break;
    }
  };

  // Filter approved records strictly in the selected date range
  const recordsInPeriod = useMemo(() => {
    return records.filter(r => {
      if (r.status === 'pending') return false;
      if (!r.date) return false;
      return r.date >= startDateStr && r.date <= endDateStr;
    });
  }, [records, startDateStr, endDateStr]);

  // Unique recorded sessions in this period (distinct date + scheduleId)
  const recordedSessionsList = useMemo(() => {
    const sessionMap = new Map<string, { date: string; scheduleId: string; count: number }>();
    recordsInPeriod.forEach(r => {
      const key = `${r.date}_${r.scheduleId}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { date: r.date, scheduleId: r.scheduleId, count: 1 });
      } else {
        sessionMap.get(key)!.count += 1;
      }
    });

    return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [recordsInPeriod]);

  // Scheduled calendar weekdays in this period (Senin - Jum'at)
  const scheduledSessionsCount = useMemo(() => {
    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
      
      const allDays = eachDayOfInterval({ start, end });
      // Day 1 to 5 are Monday to Friday
      let count = allDays.filter(d => {
        const day = d.getDay();
        return day >= 1 && day <= 5;
      }).length;

      // Also check if any special kajian happened on weekends (e.g. Sabtu 19 Sept 2026)
      const specialSessions = recordedSessionsList.filter(s => {
        try {
          const day = parseISO(s.date).getDay();
          return day === 0 || day === 6;
        } catch {
          return false;
        }
      });
      return count + specialSessions.length;
    } catch {
      return 0;
    }
  }, [startDateStr, endDateStr, recordedSessionsList]);

  // Effective Total Sessions based on selected calculation basis
  const totalSessions = useMemo(() => {
    if (sessionBasis === 'recorded') {
      return recordedSessionsList.length;
    } else if (sessionBasis === 'scheduled') {
      return scheduledSessionsCount;
    } else {
      return Math.max(0, customSessionCount);
    }
  }, [sessionBasis, recordedSessionsList.length, scheduledSessionsCount, customSessionCount]);

  // Individual Recap Calculation
  const civitasRecap = useMemo(() => {
    return civitasData.map(civitas => {
      const attended = recordsInPeriod.filter(r => r.civitasId === civitas.id);
      const attendedCount = attended.length;
      const absentCount = Math.max(0, totalSessions - attendedCount);
      const absenceRate = totalSessions > 0 ? (absentCount / totalSessions) * 100 : 0;
      const attendanceRate = totalSessions > 0 ? (attendedCount / totalSessions) * 100 : 100;

      let category: 'perfect' | 'good' | 'warning' | 'critical' = 'good';
      if (absentCount === 0 && totalSessions > 0) {
        category = 'perfect';
      } else if (absenceRate > 50 || attendedCount === 0) {
        category = 'critical';
      } else if (absenceRate > 25) {
        category = 'warning';
      }

      return {
        ...civitas,
        attendedCount,
        absentCount,
        absenceRate,
        attendanceRate,
        category,
        records: attended
      };
    });
  }, [civitasData, recordsInPeriod, totalSessions]);

  // Filtered & Sorted Civitas List for display
  const displayedCivitas = useMemo(() => {
    let result = civitasRecap;

    // Filter Gender
    if (selectedGender !== 'All') {
      result = result.filter(c => c.gender === selectedGender);
    }

    // Filter Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    // Filter Status
    if (statusFilter === 'high_absence') {
      result = result.filter(c => c.category === 'critical');
    } else if (statusFilter === 'medium_absence') {
      result = result.filter(c => c.category === 'warning');
    } else if (statusFilter === 'perfect') {
      result = result.filter(c => c.absentCount === 0);
    }

    // Sorting
    return [...result].sort((a, b) => {
      let comp = 0;
      if (sortField === 'absent') {
        comp = b.absentCount - a.absentCount;
      } else if (sortField === 'attended') {
        comp = b.attendedCount - a.attendedCount;
      } else if (sortField === 'rate') {
        comp = b.absenceRate - a.absenceRate;
      } else if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      }

      return sortDirection === 'desc' ? comp : -comp;
    });
  }, [civitasRecap, selectedGender, searchQuery, statusFilter, sortField, sortDirection]);

  // Overall Statistics for Seluruh Civitas
  const overallStats = useMemo(() => {
    const totalCivitas = civitasData.length;
    const ikhwanList = civitasRecap.filter(c => c.gender === 'Ikhwan');
    const akhwatList = civitasRecap.filter(c => c.gender === 'Akhwat');

    const totalPossibleSessionsAll = totalSessions * totalCivitas;
    const totalAttendedAll = civitasRecap.reduce((acc, c) => acc + c.attendedCount, 0);
    const totalAbsentAll = civitasRecap.reduce((acc, c) => acc + c.absentCount, 0);
    const avgAbsentPerCivitas = totalCivitas > 0 ? (totalAbsentAll / totalCivitas).toFixed(1) : '0';
    const overallAbsenceRate = totalPossibleSessionsAll > 0 
      ? ((totalAbsentAll / totalPossibleSessionsAll) * 100).toFixed(1) 
      : '0';

    // Ikhwan stats
    const totalPossibleIkhwan = totalSessions * ikhwanList.length;
    const totalAbsentIkhwan = ikhwanList.reduce((acc, c) => acc + c.absentCount, 0);
    const ikhwanAbsenceRate = totalPossibleIkhwan > 0 
      ? ((totalAbsentIkhwan / totalPossibleIkhwan) * 100).toFixed(1) 
      : '0';

    // Akhwat stats
    const totalPossibleAkhwat = totalSessions * akhwatList.length;
    const totalAbsentAkhwat = akhwatList.reduce((acc, c) => acc + c.absentCount, 0);
    const akhwatAbsenceRate = totalPossibleAkhwat > 0 
      ? ((totalAbsentAkhwat / totalPossibleAkhwat) * 100).toFixed(1) 
      : '0';

    // Civitas counts by attendance status
    const perfectCount = civitasRecap.filter(c => c.absentCount === 0 && totalSessions > 0).length;
    const highAbsenceCount = civitasRecap.filter(c => c.category === 'critical').length;
    const zeroAttendanceCount = civitasRecap.filter(c => c.attendedCount === 0).length;

    return {
      totalCivitas,
      totalSessions,
      totalPossibleSessionsAll,
      totalAttendedAll,
      totalAbsentAll,
      avgAbsentPerCivitas,
      overallAbsenceRate,
      totalAbsentIkhwan,
      ikhwanAbsenceRate,
      totalAbsentAkhwat,
      akhwatAbsenceRate,
      perfectCount,
      highAbsenceCount,
      zeroAttendanceCount,
      ikhwanCount: ikhwanList.length,
      akhwatCount: akhwatList.length
    };
  }, [civitasRecap, totalSessions]);

  // Export to PDF
  const downloadPDFReport = () => {
    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('LAPORAN REKAP KETIDAKHADIRAN KAJIAN CIVITAS', 14, 18);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('Pondok Pesantren Al-Madina Yogyakarta', 14, 25);
    
    // Period & calculation basis info
    const formattedStart = format(parseISO(startDateStr), 'dd MMMM yyyy', { locale: id });
    const formattedEnd = format(parseISO(endDateStr), 'dd MMMM yyyy', { locale: id });
    doc.text(`Periode: ${formattedStart} s/d ${formattedEnd}`, 14, 32);
    doc.text(`Total Sesi Kajian: ${totalSessions} sesi | Basis: ${
      sessionBasis === 'recorded' ? 'Sesi Terlaksana' : sessionBasis === 'scheduled' ? 'Jadwal Kalender' : 'Kustom'
    }`, 14, 38);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 43, 182, 24, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Civitas: ${overallStats.totalCivitas} orang (${overallStats.ikhwanCount} Ikhwan, ${overallStats.akhwatCount} Akhwat)`, 18, 50);
    doc.text(`Total Ketidakhadiran Seluruh Civitas: ${overallStats.totalAbsentAll} kali (Rata-rata: ${overallStats.avgAbsentPerCivitas}x / orang)`, 18, 56);
    doc.text(`Tingkat Ketidakhadiran Kolektif: ${overallStats.overallAbsenceRate}% (Ikhwan: ${overallStats.ikhwanAbsenceRate}%, Akhwat: ${overallStats.akhwatAbsenceRate}%)`, 18, 62);

    // Table 1: Ikhwan
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text('Rekap Ketidakhadiran Civitas Ikhwan', 14, 76);

    const ikhwanRows = civitasRecap
      .filter(c => c.gender === 'Ikhwan')
      .sort((a, b) => b.absentCount - a.absentCount)
      .map((c, index) => [
        (index + 1).toString(),
        c.name,
        `${c.attendedCount}x`,
        `${c.absentCount}x`,
        `${c.absenceRate.toFixed(0)}%`,
        c.absentCount === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : c.category === 'warning' ? 'Perlu Perhatian' : 'Cukup'
      ]);

    autoTable(doc, {
      startY: 80,
      head: [['No', 'Nama Civitas', 'Hadir', 'Tidak Hadir', '% Absen', 'Evaluasi']],
      body: ikhwanRows,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 35 }
      }
    });

    // Table 2: Akhwat
    const lastY = (doc as any).lastAutoTable.finalY || 160;
    
    // Check if need new page
    if (lastY > 210) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text('Rekap Ketidakhadiran Civitas Akhwat', 14, 20);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text('Rekap Ketidakhadiran Civitas Akhwat', 14, lastY + 12);
    }

    const akhwatRows = civitasRecap
      .filter(c => c.gender === 'Akhwat')
      .sort((a, b) => b.absentCount - a.absentCount)
      .map((c, index) => [
        (index + 1).toString(),
        c.name,
        `${c.attendedCount}x`,
        `${c.absentCount}x`,
        `${c.absenceRate.toFixed(0)}%`,
        c.absentCount === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : c.category === 'warning' ? 'Perlu Perhatian' : 'Cukup'
      ]);

    autoTable(doc, {
      startY: lastY > 210 ? 25 : lastY + 16,
      head: [['No', 'Nama Civitas', 'Hadir', 'Tidak Hadir', '% Absen', 'Evaluasi']],
      body: akhwatRows,
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 35 }
      }
    });

    doc.save(`Rekap_Ketidakhadiran_Kajian_${startDateStr}_sd_${endDateStr}.pdf`);
  };

  // Export to CSV
  const downloadCSVReport = () => {
    const headers = ['No', 'Nama Civitas', 'Gender', 'Total Sesi Kajian', 'Jumlah Hadir', 'Jumlah Tidak Hadir', 'Persentase Ketidakhadiran (%)', 'Status Evaluasi'];
    const rows = civitasRecap
      .sort((a, b) => b.absentCount - a.absentCount)
      .map((c, i) => [
        i + 1,
        `"${c.name}"`,
        c.gender,
        totalSessions,
        c.attendedCount,
        c.absentCount,
        c.absenceRate.toFixed(1),
        `"${c.absentCount === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : c.category === 'warning' ? 'Perlu Perhatian' : 'Cukup'}"`
      ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Ketidakhadiran_Kajian_${startDateStr}_sd_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Kontrol Tanggal & Periode */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CalendarRange size={20} />
              </span>
              <h2 className="text-lg font-bold text-slate-800">Filter Periode & Tanggal Rekap</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Hitung rekap ketidakhadiran berdasarkan pilihan cepat atau tentukan rentang tanggal kustom sesuai kebutuhan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadPDFReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              title="Unduh Laporan PDF"
            >
              <Download size={16} />
              <span>Unduh PDF</span>
            </button>
            <button
              onClick={downloadCSVReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              title="Ekspor ke Excel / CSV"
            >
              <FileSpreadsheet size={16} />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Pilihan Preset Cepat */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 self-center mr-1">Preset:</span>
          {(
            [
              { key: 'this_month', label: 'Bulan Ini' },
              { key: 'last_month', label: 'Bulan Lalu' },
              { key: 'this_week', label: 'Pekan Ini' },
              { key: 'last_week', label: 'Pekan Lalu' },
              { key: 'last_30_days', label: '30 Hari Terakhir' },
              { key: 'all_time', label: 'Sepanjang Waktu' },
              { key: 'custom', label: 'Rentang Kustom' },
            ] as const
          ).map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                periodPreset === p.key
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Tanggal Mulai dan Selesai (Custom) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tanggal Mulai (Dari)
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tanggal Selesai (Sampai)
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Dasar Perhitungan Sesi</span>
              <span className="text-[10px] text-slate-400 font-normal">Fleksibel</span>
            </label>
            <select
              value={sessionBasis}
              onChange={(e) => setSessionBasis(e.target.value as SessionBasis)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            >
              <option value="recorded">Sesi Terlaksana ({recordedSessionsList.length} sesi)</option>
              <option value="scheduled">Jadwal Kalender Senin–Jum'at ({scheduledSessionsCount} sesi)</option>
              <option value="custom">Kustom / Manual ({customSessionCount} sesi)</option>
            </select>
          </div>
        </div>

        {/* Info bar dasar sesi jika custom */}
        {sessionBasis === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <Info size={16} className="shrink-0 text-amber-600" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span>Tentukan jumlah total sesi kajian yang diharapkan pada rentang ini:</span>
              <input
                type="number"
                min="1"
                max="365"
                value={customSessionCount}
                onChange={(e) => setCustomSessionCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-white border border-amber-300 rounded-md font-bold text-center"
              />
              <span>sesi.</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>
              Periode Aktif: <strong>{format(parseISO(startDateStr), 'dd MMM yyyy', { locale: id })}</strong> s/d <strong>{format(parseISO(endDateStr), 'dd MMM yyyy', { locale: id })}</strong>
            </span>
          </div>
          <div>
            Total Sesi Kajian Dihitung: <strong className="text-slate-800 font-bold">{totalSessions} Sesi</strong>
          </div>
        </div>
      </div>

      {/* 2. Executive Stat Cards: Rekap Seluruh Civitas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ketidakhadiran Seluruh Civitas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Total Ketidakhadiran</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.totalAbsentAll} <span className="text-sm font-normal text-slate-500">kali</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh <strong>{overallStats.totalCivitas}</strong> civitas (Rata-rata {overallStats.avgAbsentPerCivitas}x/orang)
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <UserX size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Ikhwan: <strong>{overallStats.totalAbsentIkhwan}x</strong></span>
            <span>Akhwat: <strong>{overallStats.totalAbsentAkhwat}x</strong></span>
          </div>
        </div>

        {/* Card 2: Tingkat Ketidakhadiran Kolektif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Tingkat Ketidakhadiran</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.overallAbsenceRate}%
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Dari total {overallStats.totalPossibleSessionsAll} potensi presensi
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingDown size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${Math.max(0, 100 - parseFloat(overallStats.overallAbsenceRate))}%` }} 
                title={`Hadir: ${(100 - parseFloat(overallStats.overallAbsenceRate)).toFixed(1)}%`}
              />
              <div 
                className="bg-rose-500 h-full" 
                style={{ width: `${overallStats.overallAbsenceRate}%` }} 
                title={`Tidak Hadir: ${overallStats.overallAbsenceRate}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Hadir: {overallStats.totalAttendedAll}</span>
              <span>Absen: {overallStats.totalAbsentAll}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Civitas Hadir Penuh (Rajin) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Hadir Penuh (Nol Absen)</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.perfectCount} <span className="text-sm font-normal text-slate-500">orang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {((overallStats.perfectCount / overallStats.totalCivitas) * 100).toFixed(0)}% dari seluruh civitas
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-700 font-medium">
            Memenuhi seluruh {totalSessions} sesi kajian
          </div>
        </div>

        {/* Card 4: Perlu Pembinaan / Sering Absen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Perlu Perhatian Khusus</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.highAbsenceCount} <span className="text-sm font-normal text-slate-500">orang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Absen &gt; 50% atau sama sekali belum hadir
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-rose-700">
            <span>Nol kehadiran: <strong>{overallStats.zeroAttendanceCount} orang</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Tabel Rekap Ketidakhadiran Per-Individu */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filter bar tabel */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Daftar Ketidakhadiran Per-Individu</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {displayedCivitas.length} Civitas
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Urutan teratas menunjukkan civitas dengan jumlah ketidakhadiran terbanyak.
              </p>
            </div>

            {/* Filter Gender Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex">
              {(['All', 'Ikhwan', 'Akhwat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedGender(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    selectedGender === tab 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === 'All' ? 'Semua Civitas' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari nama civitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            >
              <option value="all">Semua Status Evaluasi</option>
              <option value="high_absence">Perlu Perhatian (Absen Tinggi)</option>
              <option value="medium_absence">Perlu Perhatian Sedang</option>
              <option value="perfect">Hadir Penuh (0 Absen)</option>
            </select>

            {/* Sort Field */}
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_');
                setSortField(f as any);
                setSortDirection(d as any);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            >
              <option value="absent_desc">Ketidakhadiran: Terbanyak → Sedikit</option>
              <option value="absent_asc">Ketidakhadiran: Sedikit → Terbanyak</option>
              <option value="attended_desc">Kehadiran: Terbanyak → Sedikit</option>
              <option value="name_asc">Nama: A → Z</option>
              <option value="name_desc">Nama: Z → A</option>
            </select>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 text-center w-12">No</th>
                <th className="px-5 py-3.5">Nama Civitas</th>
                <th className="px-5 py-3.5 text-center">Kategori</th>
                <th className="px-5 py-3.5 text-center">Kehadiran</th>
                <th className="px-5 py-3.5 text-center">Total Ketidakhadiran</th>
                <th className="px-5 py-3.5 text-center">% Ketidakhadiran</th>
                <th className="px-5 py-3.5 text-center">Status Evaluasi</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayedCivitas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Tidak ditemukan data civitas yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                displayedCivitas.map((civitas, index) => {
                  return (
                    <tr key={civitas.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 text-center font-medium text-slate-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{civitas.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {civitas.id}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold",
                          civitas.gender === 'Ikhwan' 
                            ? "bg-blue-50 text-blue-700 border border-blue-200" 
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        )}>
                          {civitas.gender}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs">
                          <CheckCircle2 size={13} />
                          {civitas.attendedCount} / {totalSessions}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold px-3 py-1 rounded-xl text-xs",
                          civitas.absentCount === 0 
                            ? "bg-slate-100 text-slate-600"
                            : civitas.category === 'critical'
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        )}>
                          {civitas.absentCount > 0 && <UserX size={13} />}
                          {civitas.absentCount}x Tidak Hadir
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">
                            {civitas.absenceRate.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                civitas.absentCount === 0 
                                  ? "bg-emerald-500" 
                                  : civitas.category === 'critical' 
                                  ? "bg-rose-500" 
                                  : "bg-amber-500"
                              )} 
                              style={{ width: `${Math.min(100, civitas.absenceRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {civitas.absentCount === 0 ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            Hadir Penuh
                          </span>
                        ) : civitas.category === 'critical' ? (
                          <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            Perlu Pembinaan
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Perlu Perhatian
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedCivitasDetail({
                            civitas,
                            attendedRecords: civitas.records,
                            attendedCount: civitas.attendedCount,
                            absentCount: civitas.absentCount,
                            totalSessions,
                            absenceRate: civitas.absenceRate
                          })}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-lg transition-colors"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Detail Presensi & Ketidakhadiran Civitas */}
      {selectedCivitasDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Rincian Rekap Ketidakhadiran</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCivitasDetail.civitas.name} ({selectedCivitasDetail.civitas.gender})</p>
              </div>
              <button 
                onClick={() => setSelectedCivitasDetail(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Stat box per-individu */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="block text-[11px] text-slate-500 font-medium">Total Sesi</span>
                  <span className="block text-lg font-bold text-slate-800">{selectedCivitasDetail.totalSessions}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-emerald-600 font-medium">Hadir</span>
                  <span className="block text-lg font-bold text-emerald-700">{selectedCivitasDetail.attendedCount}x</span>
                </div>
                <div>
                  <span className="block text-[11px] text-rose-600 font-medium">Tidak Hadir</span>
                  <span className="block text-lg font-bold text-rose-700">{selectedCivitasDetail.absentCount}x</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-emerald-600" />
                  Kajian yang Dihadiri ({selectedCivitasDetail.attendedRecords.length})
                </h4>
                
                {selectedCivitasDetail.attendedRecords.length === 0 ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700">
                    Civitas ini <strong>belum pernah hadir</strong> pada sesi kajian mana pun dalam rentang periode ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedCivitasDetail.attendedRecords.map((r, i) => {
                      const schedule = schedules.find(s => s.id === r.scheduleId);
                      return (
                        <div key={r.id || i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {format(parseISO(r.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              {schedule ? `${schedule.dayName}: ${schedule.ustadz} (${schedule.kitab})` : r.scheduleId === 'khusus_19sept2026' ? 'Kajian Khusus Guru & Civitas' : r.scheduleId}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px]">
                            Hadir
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Tingkat Absen: <strong>{selectedCivitasDetail.absenceRate.toFixed(1)}%</strong>
              </span>
              <button
                onClick={() => setSelectedCivitasDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
