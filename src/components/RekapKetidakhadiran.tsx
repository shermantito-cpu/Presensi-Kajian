import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subMonths,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Download, 
  FileSpreadsheet, 
  Search, 
  UserX, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  CalendarRange,
  XCircle,
  Clock,
  BookOpen,
  CalendarCheck,
  Check,
  X,
  BadgeInfo,
  Briefcase,
  GraduationCap,
  ChevronDown,
  Layers,
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { civitasData, Gender, Civitas, EmployeeType } from '../data/civitas';
import { schedules } from '../data/schedules';
import { AttendanceRecord } from '../types';
import { cn } from '../lib/utils';

interface RekapKetidakhadiranProps {
  records: AttendanceRecord[];
  onOpenEditCivitas?: (civitas: Civitas) => void;
}

type PeriodPreset = 'contoh_user' | 'this_month' | 'last_month' | 'this_week' | 'last_week' | 'last_30_days' | 'all_time' | 'custom';
type CalculationRule = 'weekly_rule' | 'daily_session';

export interface WeekPeriodInfo {
  weekNumber: number;
  label: string;
  dateRangeLabel: string;
  startISO: string;
  endISO: string;
  calendarWeekStartISO: string;
  calendarWeekEndISO: string;
}

export default function RekapKetidakhadiran({ records }: RekapKetidakhadiranProps) {
  const today = new Date();
  
  // Date preset state (default to the user's reference period: 31 Agustus 2026 - 04 Oktober 2026)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('contoh_user');
  const [startDateStr, setStartDateStr] = useState<string>('2026-08-31');
  const [endDateStr, setEndDateStr] = useState<string>('2026-10-04');

  // Calculation Rule: Weekly rule (Min 1x per pekan = hadir penuh) vs Daily session
  const [calculationRule, setCalculationRule] = useState<CalculationRule>('weekly_rule');

  // Filters & Sorting state
  const [selectedGender, setSelectedGender] = useState<'All' | Gender>('All');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<'All' | EmployeeType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'absent' | 'attended' | 'name' | 'rate'>('absent');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'high_absence' | 'medium_absence' | 'perfect'>('all');

  // Dropdown states for download actions
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);

  // Modal detail civitas
  const [selectedCivitasDetail, setSelectedCivitasDetail] = useState<{
    civitas: Civitas;
    attendedRecords: AttendanceRecord[];
    attendedCount: number;
    absentCount: number;
    totalWeeks: number;
    attendedWeeks: number;
    absenceRate: number;
    weeklyBreakdown: {
      week: WeekPeriodInfo;
      hasAttended: boolean;
      recordsInWeek: AttendanceRecord[];
    }[];
  } | null>(null);

  // Handle Preset Changes
  const applyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'contoh_user': {
        // Contoh spesifik dari user: 31 Agustus 2026 - 04 Oktober 2026
        setStartDateStr('2026-08-31');
        setEndDateStr('2026-10-04');
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
      case 'last_30_days': {
        const s = subDays(now, 30);
        setStartDateStr(format(s, 'yyyy-MM-dd'));
        setEndDateStr(format(now, 'yyyy-MM-dd'));
        break;
      }
      case 'all_time': {
        let earliest = '2026-07-01';
        if (records.length > 0) {
          const sorted = records.map(r => r.date).filter(Boolean).sort();
          if (sorted.length > 0 && sorted[0] < earliest) {
            earliest = sorted[0];
          }
        }
        setStartDateStr(earliest);
        setEndDateStr(format(now, 'yyyy-MM-dd'));
        break;
      }
      case 'custom':
        break;
    }
  };

  // Filter records within the selected date range
  const recordsInPeriod = useMemo(() => {
    return records.filter(r => {
      if (r.status === 'pending' || !r.date) return false;
      return r.date >= startDateStr && r.date <= endDateStr;
    });
  }, [records, startDateStr, endDateStr]);

  // Construct weeks within interval (Senin s/d Jum'at / Ahad)
  const weeksInPeriod = useMemo((): WeekPeriodInfo[] => {
    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return [];
      }

      let currentMonday = startOfWeek(start, { weekStartsOn: 1 });
      const weeks: WeekPeriodInfo[] = [];
      let weekIndex = 1;

      while (currentMonday <= end) {
        const currentSunday = endOfWeek(currentMonday, { weekStartsOn: 1 });
        const effectiveStart = currentMonday < start ? start : currentMonday;
        const effectiveEnd = currentSunday > end ? end : currentSunday;

        if (effectiveStart <= effectiveEnd) {
          const startISO = format(effectiveStart, 'yyyy-MM-dd');
          const endISO = format(effectiveEnd, 'yyyy-MM-dd');
          const calendarWeekStartISO = format(currentMonday, 'yyyy-MM-dd');
          const calendarWeekEndISO = format(currentSunday, 'yyyy-MM-dd');

          const rangeLabel = effectiveStart.getMonth() === effectiveEnd.getMonth()
            ? `${format(effectiveStart, 'dd', { locale: id })} - ${format(effectiveEnd, 'dd MMM yyyy', { locale: id })}`
            : `${format(effectiveStart, 'dd MMM', { locale: id })} - ${format(effectiveEnd, 'dd MMM yyyy', { locale: id })}`;

          weeks.push({
            weekNumber: weekIndex,
            label: `Pekan ${weekIndex}`,
            dateRangeLabel: rangeLabel,
            startISO,
            endISO,
            calendarWeekStartISO,
            calendarWeekEndISO
          });
          weekIndex++;
        }

        currentMonday = new Date(currentMonday);
        currentMonday.setDate(currentMonday.getDate() + 7);
      }

      return weeks;
    } catch (err) {
      console.error('Error calculating weeks', err);
      return [];
    }
  }, [startDateStr, endDateStr]);

  // Recorded Sessions in the period
  const recordedSessionsList = useMemo(() => {
    const sessionMap = new Map<string, { date: string; scheduleId: string; count: number }>();
    recordsInPeriod.forEach(r => {
      const key = `${r.date}_${r.scheduleId}`;
      if (sessionMap.has(key)) {
        sessionMap.get(key)!.count += 1;
      } else {
        sessionMap.set(key, { date: r.date, scheduleId: r.scheduleId, count: 1 });
      }
    });

    return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [recordsInPeriod]);

  // Total assessment units (either total weeks or total recorded sessions)
  const totalAssessmentUnits = useMemo(() => {
    if (calculationRule === 'weekly_rule') {
      return weeksInPeriod.length;
    } else {
      return recordedSessionsList.length;
    }
  }, [calculationRule, weeksInPeriod.length, recordedSessionsList.length]);

  // Per-Individual Recap Calculation
  const civitasRecap = useMemo(() => {
    return civitasData.map(civitas => {
      const attendedAll = recordsInPeriod.filter(r => r.civitasId === civitas.id);
      const physicalAttendedCount = attendedAll.length; // total presensi fisik

      if (calculationRule === 'weekly_rule') {
        // ATURAN PEKANAN (MINIMAL 1X PER PEKAN):
        // Jika civitas sudah hadir minimal 1x dalam pekan tersebut (Senin-Jum'at),
        // maka hari lain tidak dihitung absen (terhitung hadir di pekan tersebut).
        // Jika tidak hadir sama sekali dalam pekan tersebut, maka dihitung 1x ketidakhadiran per pekan.
        const weeklyBreakdown = weeksInPeriod.map(week => {
          const recordsInWeek = attendedAll.filter(r => 
            r.date >= week.calendarWeekStartISO && r.date <= week.calendarWeekEndISO
          );
          const hasAttended = recordsInWeek.length >= 1;
          return {
            week,
            hasAttended,
            recordsInWeek
          };
        });

        const attendedWeeksCount = weeklyBreakdown.filter(w => w.hasAttended).length;
        const absentWeeksCount = Math.max(0, weeksInPeriod.length - attendedWeeksCount);
        const absenceRate = weeksInPeriod.length > 0 ? (absentWeeksCount / weeksInPeriod.length) * 100 : 0;
        const attendanceRate = weeksInPeriod.length > 0 ? (attendedWeeksCount / weeksInPeriod.length) * 100 : 100;

        let category: 'perfect' | 'good' | 'warning' | 'critical' = 'good';
        if (absentWeeksCount === 0 && weeksInPeriod.length > 0) {
          category = 'perfect';
        } else if (absentWeeksCount >= Math.ceil(weeksInPeriod.length / 2) || attendedWeeksCount === 0) {
          category = 'critical';
        } else if (absentWeeksCount > 0) {
          category = 'warning';
        }

        return {
          ...civitas,
          totalUnits: weeksInPeriod.length,
          attendedUnits: attendedWeeksCount,
          absentUnits: absentWeeksCount,
          physicalAttendedCount,
          absenceRate,
          attendanceRate,
          category,
          weeklyBreakdown,
          records: attendedAll
        };
      } else {
        // DAILY SESSION CALCULATION
        const totalSessions = recordedSessionsList.length;
        const absentCount = Math.max(0, totalSessions - physicalAttendedCount);
        const absenceRate = totalSessions > 0 ? (absentCount / totalSessions) * 100 : 0;
        const attendanceRate = totalSessions > 0 ? (physicalAttendedCount / totalSessions) * 100 : 100;

        let category: 'perfect' | 'good' | 'warning' | 'critical' = 'good';
        if (absentCount === 0 && totalSessions > 0) {
          category = 'perfect';
        } else if (absenceRate > 50 || physicalAttendedCount === 0) {
          category = 'critical';
        } else if (absenceRate > 25) {
          category = 'warning';
        }

        return {
          ...civitas,
          totalUnits: totalSessions,
          attendedUnits: physicalAttendedCount,
          absentUnits: absentCount,
          physicalAttendedCount,
          absenceRate,
          attendanceRate,
          category,
          weeklyBreakdown: [],
          records: attendedAll
        };
      }
    });
  }, [civitasData, recordsInPeriod, weeksInPeriod, calculationRule, recordedSessionsList.length]);

  // Filtered & Sorted Civitas List for display
  const displayedCivitas = useMemo(() => {
    let result = civitasRecap;

    // Filter Employee Type
    if (selectedEmployeeType !== 'All') {
      result = result.filter(c => c.employeeType === selectedEmployeeType);
    }

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
      result = result.filter(c => c.absentUnits === 0);
    }

    // Sorting
    return [...result].sort((a, b) => {
      let comp = 0;
      if (sortField === 'absent') {
        comp = b.absentUnits - a.absentUnits;
      } else if (sortField === 'attended') {
        comp = b.attendedUnits - a.attendedUnits;
      } else if (sortField === 'rate') {
        comp = b.absenceRate - a.absenceRate;
      } else if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      }

      return sortDirection === 'desc' ? comp : -comp;
    });
  }, [civitasRecap, selectedEmployeeType, selectedGender, searchQuery, statusFilter, sortField, sortDirection]);

  // Overall Statistics for Seluruh Civitas & Kelompok Jenis Pegawai
  const overallStats = useMemo(() => {
    const totalCivitas = civitasData.length;
    const ikhwanList = civitasRecap.filter(c => c.gender === 'Ikhwan');
    const akhwatList = civitasRecap.filter(c => c.gender === 'Akhwat');

    // Kelompok Jenis Pegawai
    const bagianUmumList = civitasRecap.filter(c => c.employeeType === 'Bagian Umum');
    const ptkList = civitasRecap.filter(c => c.employeeType === 'Pendidik dan Tenaga Kependidikan');
    const ptkIkhwanList = ptkList.filter(c => c.gender === 'Ikhwan');
    const ptkAkhwatList = ptkList.filter(c => c.gender === 'Akhwat');

    const totalPossibleUnitsAll = totalAssessmentUnits * totalCivitas;
    const totalAttendedUnitsAll = civitasRecap.reduce((acc, c) => acc + c.attendedUnits, 0);
    const totalAbsentUnitsAll = civitasRecap.reduce((acc, c) => acc + c.absentUnits, 0);
    const avgAbsentPerCivitas = totalCivitas > 0 ? (totalAbsentUnitsAll / totalCivitas).toFixed(1) : '0';
    const overallAbsenceRate = totalPossibleUnitsAll > 0 
      ? ((totalAbsentUnitsAll / totalPossibleUnitsAll) * 100).toFixed(1) 
      : '0';

    // Total physical attendances across all civitas
    const totalPhysicalPresensiAll = civitasRecap.reduce((acc, c) => acc + c.physicalAttendedCount, 0);

    // Ikhwan stats
    const totalPossibleIkhwan = totalAssessmentUnits * ikhwanList.length;
    const totalAbsentIkhwan = ikhwanList.reduce((acc, c) => acc + c.absentUnits, 0);
    const ikhwanAbsenceRate = totalPossibleIkhwan > 0 
      ? ((totalAbsentIkhwan / totalPossibleIkhwan) * 100).toFixed(1) 
      : '0';

    // Akhwat stats
    const totalPossibleAkhwat = totalAssessmentUnits * akhwatList.length;
    const totalAbsentAkhwat = akhwatList.reduce((acc, c) => acc + c.absentUnits, 0);
    const akhwatAbsenceRate = totalPossibleAkhwat > 0 
      ? ((totalAbsentAkhwat / totalPossibleAkhwat) * 100).toFixed(1) 
      : '0';

    // Bagian Umum stats
    const totalPossibleBagianUmum = totalAssessmentUnits * bagianUmumList.length;
    const totalAbsentBagianUmum = bagianUmumList.reduce((acc, c) => acc + c.absentUnits, 0);
    const totalAttendedBagianUmum = bagianUmumList.reduce((acc, c) => acc + c.attendedUnits, 0);
    const bagianUmumAbsenceRate = totalPossibleBagianUmum > 0 
      ? ((totalAbsentBagianUmum / totalPossibleBagianUmum) * 100).toFixed(1) 
      : '0';
    const bagianUmumPerfectCount = bagianUmumList.filter(c => c.absentUnits === 0 && totalAssessmentUnits > 0).length;

    // PTK stats
    const totalPossiblePTK = totalAssessmentUnits * ptkList.length;
    const totalAbsentPTK = ptkList.reduce((acc, c) => acc + c.absentUnits, 0);
    const totalAttendedPTK = ptkList.reduce((acc, c) => acc + c.attendedUnits, 0);
    const ptkAbsenceRate = totalPossiblePTK > 0 
      ? ((totalAbsentPTK / totalPossiblePTK) * 100).toFixed(1) 
      : '0';
    const ptkPerfectCount = ptkList.filter(c => c.absentUnits === 0 && totalAssessmentUnits > 0).length;

    // Civitas counts by status
    const perfectCount = civitasRecap.filter(c => c.absentUnits === 0 && totalAssessmentUnits > 0).length;
    const highAbsenceCount = civitasRecap.filter(c => c.category === 'critical').length;
    const zeroAttendanceCount = civitasRecap.filter(c => c.attendedUnits === 0).length;

    return {
      totalCivitas,
      totalAssessmentUnits,
      totalPossibleUnitsAll,
      totalAttendedUnitsAll,
      totalAbsentUnitsAll,
      totalPhysicalPresensiAll,
      avgAbsentPerCivitas,
      overallAbsenceRate,
      totalAbsentIkhwan,
      ikhwanAbsenceRate,
      totalAbsentAkhwat,
      akhwatAbsenceRate,
      // Kelompok Pegawai stats
      bagianUmumCount: bagianUmumList.length,
      bagianUmumList,
      totalAbsentBagianUmum,
      totalAttendedBagianUmum,
      bagianUmumAbsenceRate,
      bagianUmumPerfectCount,
      ptkCount: ptkList.length,
      ptkList,
      ptkIkhwanCount: ptkIkhwanList.length,
      ptkAkhwatCount: ptkAkhwatList.length,
      totalAbsentPTK,
      totalAttendedPTK,
      ptkAbsenceRate,
      ptkPerfectCount,
      // Status counts
      perfectCount,
      highAbsenceCount,
      zeroAttendanceCount,
      ikhwanCount: ikhwanList.length,
      akhwatCount: akhwatList.length
    };
  }, [civitasRecap, totalAssessmentUnits]);

  // Export to PDF with grouping by Employee Type
  const downloadPDFReport = (targetGroup: 'All' | EmployeeType = 'All') => {
    const doc = new jsPDF();
    const formattedStart = format(parseISO(startDateStr), 'dd MMMM yyyy', { locale: id });
    const formattedEnd = format(parseISO(endDateStr), 'dd MMMM yyyy', { locale: id });

    // Header Title
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);

    if (targetGroup === 'Bagian Umum') {
      doc.text('LAPORAN REKAP KETIDAKHADIRAN - BAGIAN UMUM', 14, 18);
    } else if (targetGroup === 'Pendidik dan Tenaga Kependidikan') {
      doc.text('LAPORAN REKAP KETIDAKHADIRAN - PENDIDIK & TENAGA KEPENDIDIKAN', 14, 18);
    } else {
      doc.text('LAPORAN REKAP KETIDAKHADIRAN KAJIAN CIVITAS', 14, 18);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Pondok Pesantren Al-Madina Al-Islami Prabumulih', 14, 24);
    doc.text(`Periode: ${formattedStart} s/d ${formattedEnd} (${weeksInPeriod.length} Pekan Kajian)`, 14, 30);
    
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87);
    doc.text('Kebijakan: Hadir minimal 1x per pekan (Senin-Jum\'at) = Terhitung hadir penuh sepekan (tidak dihitung absen).', 14, 36);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 40, 182, 26, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    if (targetGroup === 'Bagian Umum') {
      doc.text(`Kelompok: Jenis Pegawai Bagian Umum (Total: ${overallStats.bagianUmumCount} Pegawai) | Total Pekan: ${overallStats.totalAssessmentUnits} Pekan`, 18, 47);
      doc.text(`Total Ketidakhadiran: ${overallStats.totalAbsentBagianUmum} pekan absen (Rata-rata: ${(overallStats.totalAbsentBagianUmum / (overallStats.bagianUmumCount || 1)).toFixed(1)} pekan/orang)`, 18, 53);
      doc.text(`Tingkat Ketidakhadiran: ${overallStats.bagianUmumAbsenceRate}% | Hadir Penuh (0x Absen): ${overallStats.bagianUmumPerfectCount} orang`, 18, 59);
    } else if (targetGroup === 'Pendidik dan Tenaga Kependidikan') {
      doc.text(`Kelompok: Pendidik & Tenaga Kependidikan (Total: ${overallStats.ptkCount} Pegawai: ${overallStats.ptkIkhwanCount} Ikhwan, ${overallStats.ptkAkhwatCount} Akhwat)`, 18, 47);
      doc.text(`Total Ketidakhadiran: ${overallStats.totalAbsentPTK} pekan absen (Rata-rata: ${(overallStats.totalAbsentPTK / (overallStats.ptkCount || 1)).toFixed(1)} pekan/orang)`, 18, 53);
      doc.text(`Tingkat Ketidakhadiran: ${overallStats.ptkAbsenceRate}% | Hadir Penuh (0x Absen): ${overallStats.ptkPerfectCount} orang`, 18, 59);
    } else {
      doc.text(`Total Civitas: ${overallStats.totalCivitas} orang (Bagian Umum: ${overallStats.bagianUmumCount}, Pendidik & Kependidikan: ${overallStats.ptkCount}) | Total: ${overallStats.totalAssessmentUnits} Pekan`, 18, 46);
      doc.text(`Total Ketidakhadiran Seluruh Civitas: ${overallStats.totalAbsentUnitsAll} pekan absen (Tingkat Absen Kolektif: ${overallStats.overallAbsenceRate}%)`, 18, 51.5);
      doc.text(`• Bagian Umum (${overallStats.bagianUmumCount} org): ${overallStats.totalAbsentBagianUmum} pekan absen (${overallStats.bagianUmumAbsenceRate}%) | Hadir Penuh: ${overallStats.bagianUmumPerfectCount} org`, 18, 57);
      doc.text(`• Pendidik & Tenaga Kependidikan (${overallStats.ptkCount} org): ${overallStats.totalAbsentPTK} pekan absen (${overallStats.ptkAbsenceRate}%) | Hadir Penuh: ${overallStats.ptkPerfectCount} org`, 18, 62.5);
    }

    const tableColumns = [
      { 0: { cellWidth: 8, halign: 'center' as const } },
      { 2: { cellWidth: 26, halign: 'center' as const } },
      { 3: { cellWidth: 28, halign: 'center' as const, fontStyle: 'bold' as const } },
      { 4: { cellWidth: 22, halign: 'center' as const } },
      { 5: { cellWidth: 16, halign: 'center' as const } },
      { 6: { cellWidth: 32 } }
    ];

    if (targetGroup === 'Bagian Umum' || targetGroup === 'All') {
      // 1. BAGIAN UMUM TABLE
      doc.setFontSize(11);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`1. Kelompok Pegawai: Bagian Umum (${overallStats.bagianUmumCount} Civitas)`, 14, 74);

      const bagianUmumRows = civitasRecap
        .filter(c => c.employeeType === 'Bagian Umum')
        .sort((a, b) => b.absentUnits - a.absentUnits)
        .map((c, index) => [
          (index + 1).toString(),
          c.name,
          `${c.attendedUnits} / ${overallStats.totalAssessmentUnits} Pekan`,
          c.absentUnits > 0 ? `${c.absentUnits}x Pekan Absen` : '0x (Nol Absen)',
          `${c.physicalAttendedCount}x`,
          `${c.absenceRate.toFixed(0)}%`,
          c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'
        ]);

      autoTable(doc, {
        startY: 78,
        head: [['No', 'Nama Civitas', 'Pekan Hadir', 'Ketidakhadiran', 'Presensi Fisik', '% Absen', 'Evaluasi']],
        body: bagianUmumRows,
        theme: 'grid',
        headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 32 }
        }
      });
    }

    if (targetGroup === 'Pendidik dan Tenaga Kependidikan' || targetGroup === 'All') {
      if (targetGroup === 'All') {
        // Start PTK on new page for clean executive reading
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('LAPORAN REKAP KETIDAKHADIRAN KAJIAN CIVITAS', 14, 18);
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('Pondok Pesantren Al-Madina Al-Islami Prabumulih', 14, 24);
        doc.setFontSize(11);
        doc.setTextColor(4, 120, 87);
        doc.text(`2. Kelompok Pegawai: Pendidik dan Tenaga Kependidikan (${overallStats.ptkCount} Civitas)`, 14, 32);
        
        // PTK Ikhwan
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`A. Pendidik & Tenaga Kependidikan - Ikhwan (${overallStats.ptkIkhwanCount} Civitas)`, 14, 40);

        const ptkIkhwanRows = civitasRecap
          .filter(c => c.employeeType === 'Pendidik dan Tenaga Kependidikan' && c.gender === 'Ikhwan')
          .sort((a, b) => b.absentUnits - a.absentUnits)
          .map((c, index) => [
            (index + 1).toString(),
            c.name,
            `${c.attendedUnits} / ${overallStats.totalAssessmentUnits} Pekan`,
            c.absentUnits > 0 ? `${c.absentUnits}x Pekan Absen` : '0x (Nol Absen)',
            `${c.physicalAttendedCount}x`,
            `${c.absenceRate.toFixed(0)}%`,
            c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'
          ]);

        autoTable(doc, {
          startY: 44,
          head: [['No', 'Nama Civitas', 'Pekan Hadir', 'Ketidakhadiran', 'Presensi Fisik', '% Absen', 'Evaluasi']],
          body: ptkIkhwanRows,
          theme: 'grid',
          headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 32 }
          }
        });

        // PTK Akhwat
        const lastY = (doc as any).lastAutoTable.finalY || 160;
        let startAkhwatY = lastY + 12;

        if (startAkhwatY > 210) {
          doc.addPage();
          startAkhwatY = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`B. Pendidik & Tenaga Kependidikan - Akhwat (${overallStats.ptkAkhwatCount} Civitas)`, 14, startAkhwatY);

        const ptkAkhwatRows = civitasRecap
          .filter(c => c.employeeType === 'Pendidik dan Tenaga Kependidikan' && c.gender === 'Akhwat')
          .sort((a, b) => b.absentUnits - a.absentUnits)
          .map((c, index) => [
            (index + 1).toString(),
            c.name,
            `${c.attendedUnits} / ${overallStats.totalAssessmentUnits} Pekan`,
            c.absentUnits > 0 ? `${c.absentUnits}x Pekan Absen` : '0x (Nol Absen)',
            `${c.physicalAttendedCount}x`,
            `${c.absenceRate.toFixed(0)}%`,
            c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'
          ]);

        autoTable(doc, {
          startY: startAkhwatY + 4,
          head: [['No', 'Nama Civitas', 'Pekan Hadir', 'Ketidakhadiran', 'Presensi Fisik', '% Absen', 'Evaluasi']],
          body: ptkAkhwatRows,
          theme: 'grid',
          headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255] }, // purple-700
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 32 }
          }
        });
      } else {
        // Dedicated PTK Document
        doc.setFontSize(11);
        doc.setTextColor(4, 120, 87);
        doc.text(`Pendidik & Tenaga Kependidikan - Ikhwan (${overallStats.ptkIkhwanCount} Civitas)`, 14, 74);

        const ptkIkhwanRows = civitasRecap
          .filter(c => c.employeeType === 'Pendidik dan Tenaga Kependidikan' && c.gender === 'Ikhwan')
          .sort((a, b) => b.absentUnits - a.absentUnits)
          .map((c, index) => [
            (index + 1).toString(),
            c.name,
            `${c.attendedUnits} / ${overallStats.totalAssessmentUnits} Pekan`,
            c.absentUnits > 0 ? `${c.absentUnits}x Pekan Absen` : '0x (Nol Absen)',
            `${c.physicalAttendedCount}x`,
            `${c.absenceRate.toFixed(0)}%`,
            c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'
          ]);

        autoTable(doc, {
          startY: 78,
          head: [['No', 'Nama Civitas', 'Pekan Hadir', 'Ketidakhadiran', 'Presensi Fisik', '% Absen', 'Evaluasi']],
          body: ptkIkhwanRows,
          theme: 'grid',
          headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 32 }
          }
        });

        const lastY = (doc as any).lastAutoTable.finalY || 160;
        let startAkhwatY = lastY + 12;

        if (startAkhwatY > 210) {
          doc.addPage();
          startAkhwatY = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(109, 40, 217);
        doc.text(`Pendidik & Tenaga Kependidikan - Akhwat (${overallStats.ptkAkhwatCount} Civitas)`, 14, startAkhwatY);

        const ptkAkhwatRows = civitasRecap
          .filter(c => c.employeeType === 'Pendidik dan Tenaga Kependidikan' && c.gender === 'Akhwat')
          .sort((a, b) => b.absentUnits - a.absentUnits)
          .map((c, index) => [
            (index + 1).toString(),
            c.name,
            `${c.attendedUnits} / ${overallStats.totalAssessmentUnits} Pekan`,
            c.absentUnits > 0 ? `${c.absentUnits}x Pekan Absen` : '0x (Nol Absen)',
            `${c.physicalAttendedCount}x`,
            `${c.absenceRate.toFixed(0)}%`,
            c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'
          ]);

        autoTable(doc, {
          startY: startAkhwatY + 4,
          head: [['No', 'Nama Civitas', 'Pekan Hadir', 'Ketidakhadiran', 'Presensi Fisik', '% Absen', 'Evaluasi']],
          body: ptkAkhwatRows,
          theme: 'grid',
          headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 32 }
          }
        });
      }
    }

    let filename = `Rekap_Ketidakhadiran_Kajian_Lengkap_Per_Jenis_Pegawai_${startDateStr}_sd_${endDateStr}.pdf`;
    if (targetGroup === 'Bagian Umum') {
      filename = `Rekap_Ketidakhadiran_Bagian_Umum_${startDateStr}_sd_${endDateStr}.pdf`;
    } else if (targetGroup === 'Pendidik dan Tenaga Kependidikan') {
      filename = `Rekap_Ketidakhadiran_Pendidik_Tenaga_Kependidikan_${startDateStr}_sd_${endDateStr}.pdf`;
    }

    doc.save(filename);
    setPdfMenuOpen(false);
  };

  // Export to CSV with grouping by Employee Type
  const downloadCSVReport = (targetGroup: 'All' | EmployeeType = 'All') => {
    const headers = [
      'No', 
      'Nama Civitas', 
      'Jenis Pegawai',
      'Gender', 
      'Total Pekan Kajian', 
      'Pekan Terpenuhi (Hadir Min 1x)', 
      'Total Ketidakhadiran (Pekan Absen)', 
      'Total Kehadiran Fisik',
      'Persentase Ketidakhadiran (%)', 
      'Status Evaluasi'
    ];
    
    let targetList = civitasRecap;
    if (targetGroup !== 'All') {
      targetList = targetList.filter(c => c.employeeType === targetGroup);
    }

    const rows = [...targetList]
      .sort((a, b) => {
        // Group Bagian Umum first, then PTK if All
        if (targetGroup === 'All' && a.employeeType !== b.employeeType) {
          return a.employeeType === 'Bagian Umum' ? -1 : 1;
        }
        return b.absentUnits - a.absentUnits;
      })
      .map((c, i) => [
        i + 1,
        `"${c.name}"`,
        `"${c.employeeType}"`,
        c.gender,
        overallStats.totalAssessmentUnits,
        c.attendedUnits,
        c.absentUnits,
        c.physicalAttendedCount,
        c.absenceRate.toFixed(1),
        `"${c.absentUnits === 0 ? 'Hadir Penuh' : c.category === 'critical' ? 'Perlu Pembinaan' : 'Perlu Perhatian'}"`
      ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    let filename = `Rekap_Ketidakhadiran_Kajian_Lengkap_Per_Jenis_Pegawai_${startDateStr}_sd_${endDateStr}.csv`;
    if (targetGroup === 'Bagian Umum') {
      filename = `Rekap_Ketidakhadiran_Bagian_Umum_${startDateStr}_sd_${endDateStr}.csv`;
    } else if (targetGroup === 'Pendidik dan Tenaga Kependidikan') {
      filename = `Rekap_Ketidakhadiran_Pendidik_Tenaga_Kependidikan_${startDateStr}_sd_${endDateStr}.csv`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCsvMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Penjelasan Kebijakan Aturan Pekanan */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CalendarRange size={20} />
              </span>
              <h2 className="text-lg font-bold text-slate-800">Rekap Ketidakhadiran Kajian Civitas</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Perhitungan ketidakhadiran berbasis tanggal kustom dengan pengelompokan Jenis Pegawai.
            </p>
          </div>

          {/* Download Buttons with Dropdown Grouping */}
          <div className="flex flex-wrap items-center gap-2 relative">
            
            {/* PDF Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setPdfMenuOpen(!pdfMenuOpen);
                  setCsvMenuOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                title="Unduh Laporan PDF"
              >
                <Download size={16} />
                <span>Unduh PDF</span>
                <ChevronDown size={14} className={cn("transition-transform", pdfMenuOpen && "rotate-180")} />
              </button>

              {pdfMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilihan Pengelompokan PDF
                  </div>
                  <button
                    onClick={() => downloadPDFReport('All')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-start gap-2.5 transition"
                  >
                    <Layers className="text-rose-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Semua Jenis Pegawai (Dikelompokkan)</div>
                      <div className="text-[11px] text-slate-500">Laporan gabungan Bagian Umum & PTK lengkap</div>
                    </div>
                  </button>
                  <button
                    onClick={() => downloadPDFReport('Bagian Umum')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-amber-50 flex items-start gap-2.5 transition"
                  >
                    <Briefcase className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Khusus Bagian Umum ({overallStats.bagianUmumCount} Pegawai)</div>
                      <div className="text-[11px] text-slate-500">Hanya civitas pegawai Bagian Umum</div>
                    </div>
                  </button>
                  <button
                    onClick={() => downloadPDFReport('Pendidik dan Tenaga Kependidikan')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 flex items-start gap-2.5 transition"
                  >
                    <GraduationCap className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Khusus Pendidik & Tenaga Kependidikan ({overallStats.ptkCount})</div>
                      <div className="text-[11px] text-slate-500">Tabel Ikhwan & Akhwat PTK</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* CSV Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setCsvMenuOpen(!csvMenuOpen);
                  setPdfMenuOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                title="Ekspor ke Excel / CSV"
              >
                <FileSpreadsheet size={16} />
                <span>Ekspor CSV</span>
                <ChevronDown size={14} className={cn("transition-transform", csvMenuOpen && "rotate-180")} />
              </button>

              {csvMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilihan Pengelompokan CSV
                  </div>
                  <button
                    onClick={() => downloadCSVReport('All')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-start gap-2.5 transition"
                  >
                    <Layers className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Semua Jenis Pegawai (Lengkap)</div>
                      <div className="text-[11px] text-slate-500">Dengan kolom Jenis Pegawai (51 civitas)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => downloadCSVReport('Bagian Umum')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-amber-50 flex items-start gap-2.5 transition"
                  >
                    <Briefcase className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Khusus Bagian Umum ({overallStats.bagianUmumCount} Pegawai)</div>
                      <div className="text-[11px] text-slate-500">File spreadsheet khusus Bagian Umum</div>
                    </div>
                  </button>
                  <button
                    onClick={() => downloadCSVReport('Pendidik dan Tenaga Kependidikan')}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 flex items-start gap-2.5 transition"
                  >
                    <GraduationCap className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <div className="font-bold text-slate-800">Khusus Pendidik & Tenaga Kependidikan ({overallStats.ptkCount})</div>
                      <div className="text-[11px] text-slate-500">File spreadsheet khusus PTK</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Kotak Info Aturan Kebijakan Pekanan */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
          <BadgeInfo className="text-emerald-700 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="font-bold text-emerald-950 text-sm">Ketentuan Perhitungan Kehadiran Kajian Pekanan (Senin–Jum'at):</h4>
            <p className="mt-1 text-emerald-800">
              • <strong>Hadir &ge; 1 kali sepekan:</strong> Civitas sudah memenuhi kewajiban hadir kajian pekan tersebut. Hari lain pada pekan tersebut <strong>tidak dihitung absen</strong> (terhitung hadir).
            </p>
            <p className="mt-0.5 text-emerald-800">
              • <strong>Tidak hadir sama sekali sepekan:</strong> Jika civitas tidak mengisi presensi minimal satu kali dalam satu pekan kajian, maka dihitung <strong>1 kali ketidakhadiran per pekan</strong>.
            </p>
          </div>
        </div>

        {/* Pilihan Preset Cepat */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Pilihan Periode Tanggal Cepat:
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => applyPreset('contoh_user')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'contoh_user'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              📅 31 Agt - 04 Okt 2026 (Periode Contoh)
            </button>
            <button
              onClick={() => applyPreset('this_month')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'this_month'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => applyPreset('last_month')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'last_month'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => applyPreset('this_week')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'this_week'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              Pekan Ini
            </button>
            <button
              onClick={() => applyPreset('last_week')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'last_week'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              Pekan Lalu
            </button>
            <button
              onClick={() => applyPreset('last_30_days')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'last_30_days'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              30 Hari Terakhir
            </button>
            <button
              onClick={() => applyPreset('all_time')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                periodPreset === 'all_time'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              Semua Riwayat
            </button>
          </div>
        </div>

        {/* Input Kustom Tanggal & Metode Perhitungan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tanggal Mulai (Custom)
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tanggal Selesai (Custom)
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Metode Perhitungan
            </label>
            <select
              value={calculationRule}
              onChange={(e) => setCalculationRule(e.target.value as CalculationRule)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            >
              <option value="weekly_rule">Aturan Pekanan (Min. 1x / Pekan = Hadir Penuh)</option>
              <option value="daily_session">Hitung Per-Sesi Kajian Harian</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>
              Periode: <strong>{format(parseISO(startDateStr), 'dd MMM yyyy', { locale: id })}</strong> s/d <strong>{format(parseISO(endDateStr), 'dd MMM yyyy', { locale: id })}</strong>
            </span>
          </div>
          <div>
            Total Periode: <strong className="text-emerald-800 font-bold">{weeksInPeriod.length} Pekan Kajian</strong>
            {calculationRule === 'weekly_rule' && (
              <span className="text-slate-500 ml-1.5">({weeksInPeriod.length} target kehadiran pekanan)</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Kartu Komparasi Kelompok Jenis Pegawai */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Kelompok Bagian Umum */}
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-white p-5 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Briefcase size={16} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Jenis Pegawai: Bagian Umum
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-2.5">
                {overallStats.totalAbsentBagianUmum}{' '}
                <span className="text-sm font-medium text-slate-500">pekan absen</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Total <strong>{overallStats.bagianUmumCount} civitas</strong> • Tingkat Absen: <strong className="text-amber-800">{overallStats.bagianUmumAbsenceRate}%</strong>
              </p>
            </div>
            
            <div className="flex flex-col gap-1 items-end">
              <button
                onClick={() => downloadPDFReport('Bagian Umum')}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                title="Unduh PDF Bagian Umum"
              >
                <Download size={13} />
                <span>PDF Bagian Umum</span>
              </button>
              <button
                onClick={() => downloadCSVReport('Bagian Umum')}
                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition"
                title="Ekspor CSV Bagian Umum"
              >
                <FileSpreadsheet size={13} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
              <span className="block text-slate-400 text-[10px]">Hadir Penuh</span>
              <strong className="text-emerald-700 text-sm">{overallStats.bagianUmumPerfectCount} org</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
              <span className="block text-slate-400 text-[10px]">Pekan Terpenuhi</span>
              <strong className="text-slate-800 text-sm">{overallStats.totalAttendedBagianUmum}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
              <span className="block text-slate-400 text-[10px]">Rata-rata Absen</span>
              <strong className="text-amber-700 text-sm">{(overallStats.totalAbsentBagianUmum / (overallStats.bagianUmumCount || 1)).toFixed(1)} /org</strong>
            </div>
          </div>
        </div>

        {/* Kelompok Pendidik dan Tenaga Kependidikan */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-white p-5 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                  <GraduationCap size={16} />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Jenis Pegawai: Pendidik & Tenaga Kependidikan
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-2.5">
                {overallStats.totalAbsentPTK}{' '}
                <span className="text-sm font-medium text-slate-500">pekan absen</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Total <strong>{overallStats.ptkCount} civitas</strong> ({overallStats.ptkIkhwanCount} Ikhwan, {overallStats.ptkAkhwatCount} Akhwat) • Tingkat Absen: <strong className="text-indigo-800">{overallStats.ptkAbsenceRate}%</strong>
              </p>
            </div>

            <div className="flex flex-col gap-1 items-end">
              <button
                onClick={() => downloadPDFReport('Pendidik dan Tenaga Kependidikan')}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                title="Unduh PDF Pendidik & Tenaga Kependidikan"
              >
                <Download size={13} />
                <span>PDF PTK</span>
              </button>
              <button
                onClick={() => downloadCSVReport('Pendidik dan Tenaga Kependidikan')}
                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-semibold transition"
                title="Ekspor CSV PTK"
              >
                <FileSpreadsheet size={13} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
              <span className="block text-slate-400 text-[10px]">Hadir Penuh</span>
              <strong className="text-emerald-700 text-sm">{overallStats.ptkPerfectCount} org</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
              <span className="block text-slate-400 text-[10px]">Pekan Terpenuhi</span>
              <strong className="text-slate-800 text-sm">{overallStats.totalAttendedPTK}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
              <span className="block text-slate-400 text-[10px]">Rata-rata Absen</span>
              <strong className="text-indigo-700 text-sm">{(overallStats.totalAbsentPTK / (overallStats.ptkCount || 1)).toFixed(1)} /org</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Executive Stat Cards: Rekap Seluruh Civitas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ketidakhadiran Seluruh Civitas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Total Ketidakhadiran</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.totalAbsentUnitsAll}{' '}
                <span className="text-sm font-normal text-slate-500">
                  {calculationRule === 'weekly_rule' ? 'pekan absen' : 'kali absen'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh <strong>{overallStats.totalCivitas}</strong> civitas (Rata-rata {overallStats.avgAbsentPerCivitas} pekan/orang)
              </p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <UserX size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Bagian Umum: <strong>{overallStats.totalAbsentBagianUmum}</strong></span>
            <span>PTK: <strong>{overallStats.totalAbsentPTK}</strong></span>
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
                Dari {overallStats.totalPossibleUnitsAll} potensi {calculationRule === 'weekly_rule' ? 'pekan' : 'presensi'} seluruh civitas
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
                title={`Terpenuhi: ${(100 - parseFloat(overallStats.overallAbsenceRate)).toFixed(1)}%`}
              />
              <div 
                className="bg-rose-500 h-full" 
                style={{ width: `${overallStats.overallAbsenceRate}%` }} 
                title={`Tidak Hadir: ${overallStats.overallAbsenceRate}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Hadir: {overallStats.totalAttendedUnitsAll} pekan</span>
              <span>Absen: {overallStats.totalAbsentUnitsAll} pekan</span>
            </div>
          </div>
        </div>

        {/* Card 3: Civitas Hadir Penuh (Nol Absen) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Hadir Penuh (0x Absen)</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.perfectCount} <span className="text-sm font-normal text-slate-500">orang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {((overallStats.perfectCount / overallStats.totalCivitas) * 100).toFixed(0)}% civitas hadir setiap pekan
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-700 font-medium">
            Memenuhi minimal 1x hadir di seluruh {overallStats.totalAssessmentUnits} pekan kajian
          </div>
        </div>

        {/* Card 4: Perlu Pembinaan / Sering Absen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Perlu Perhatian</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-2">
                {overallStats.highAbsenceCount} <span className="text-sm font-normal text-slate-500">orang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Absen &ge; 50% dari total pekan kajian
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

      {/* 4. Tabel Rekap Ketidakhadiran Per-Individu */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filter bar tabel */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Daftar Rekap Ketidakhadiran Per-Individu</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {displayedCivitas.length} Civitas
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dapat difilter berdasarkan Jenis Pegawai, Gender, dan Tingkat Ketidakhadiran.
              </p>
            </div>

            {/* Filter Jenis Pegawai Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedEmployeeType('All')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  selectedEmployeeType === 'All'
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua Pegawai ({overallStats.totalCivitas})
              </button>
              <button
                onClick={() => setSelectedEmployeeType('Bagian Umum')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  selectedEmployeeType === 'Bagian Umum'
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-800 hover:bg-amber-50"
                )}
              >
                <Briefcase size={12} />
                Bagian Umum ({overallStats.bagianUmumCount})
              </button>
              <button
                onClick={() => setSelectedEmployeeType('Pendidik dan Tenaga Kependidikan')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  selectedEmployeeType === 'Pendidik dan Tenaga Kependidikan'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-800 hover:bg-indigo-50"
                )}
              >
                <GraduationCap size={12} />
                Pendidik & PTK ({overallStats.ptkCount})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari nama civitas (cth: Agus Arwanto, Alvin, Anggara Pratodi)..."
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

            {/* Filter Gender */}
            <div className="bg-slate-100 p-1 rounded-xl flex shrink-0">
              {(['All', 'Ikhwan', 'Akhwat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedGender(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    selectedGender === tab 
                      ? "bg-white text-slate-800 shadow-xs" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === 'All' ? 'Semua Gender' : tab}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            >
              <option value="all">Semua Evaluasi</option>
              <option value="high_absence">Perlu Pembinaan (Absen Tinggi)</option>
              <option value="medium_absence">Perlu Perhatian</option>
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
              <option value="attended_desc">Kehadiran Terbanyak</option>
              <option value="rate_desc">% Absen Tertinggi</option>
              <option value="name_asc">Nama (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 text-center w-12">No</th>
                <th className="px-5 py-3.5">Nama Civitas & Jenis Pegawai</th>
                <th className="px-5 py-3.5 text-center">Gender</th>
                <th className="px-5 py-3.5 text-center">
                  {calculationRule === 'weekly_rule' ? 'Pekan Terpenuhi' : 'Presensi Tercatat'}
                </th>
                <th className="px-5 py-3.5 text-center">Ketidakhadiran</th>
                <th className="px-5 py-3.5 text-center">Status Tiap Pekan</th>
                <th className="px-5 py-3.5 text-center">% Ketidakhadiran</th>
                <th className="px-5 py-3.5 text-center">Status Evaluasi</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayedCivitas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{civitas.name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1",
                            civitas.employeeType === 'Bagian Umum'
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}>
                            {civitas.employeeType === 'Bagian Umum' ? (
                              <>
                                <Briefcase size={10} />
                                Bagian Umum
                              </>
                            ) : (
                              <>
                                <GraduationCap size={10} />
                                Pendidik & PTK
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Presensi Fisik: <strong>{civitas.physicalAttendedCount} kali</strong>
                        </div>
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
                          <CalendarCheck size={13} />
                          {civitas.attendedUnits} / {civitas.totalUnits} {calculationRule === 'weekly_rule' ? 'Pekan' : 'Sesi'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold px-3 py-1 rounded-xl text-xs",
                          civitas.absentUnits === 0 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : civitas.category === 'critical'
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        )}>
                          {civitas.absentUnits > 0 ? (
                            <>
                              <UserX size={13} />
                              {civitas.absentUnits}x Tidak Hadir
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              0x (Nol Absen)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {/* Tracker Rincian Pekan */}
                        {calculationRule === 'weekly_rule' && civitas.weeklyBreakdown.length > 0 ? (
                          <div className="inline-flex items-center gap-1">
                            {civitas.weeklyBreakdown.map((wb) => (
                              <span
                                key={wb.week.weekNumber}
                                title={`${wb.week.label} (${wb.week.dateRangeLabel}): ${wb.hasAttended ? 'Hadir (' + wb.recordsInWeek.length + 'x)' : 'Tidak Hadir'}`}
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-transform hover:scale-110",
                                  wb.hasAttended
                                    ? "bg-emerald-500 text-white border-emerald-600"
                                    : "bg-rose-100 text-rose-700 border-rose-300"
                                )}
                              >
                                {wb.hasAttended ? <Check size={12} /> : <X size={12} />}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">
                            {civitas.absenceRate.toFixed(0)}%
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                civitas.absenceRate > 50 
                                  ? "bg-rose-500" 
                                  : civitas.absenceRate > 25 
                                  ? "bg-amber-500" 
                                  : "bg-emerald-500"
                              )}
                              style={{ width: `${civitas.absenceRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold",
                          civitas.category === 'perfect' && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                          civitas.category === 'good' && "bg-blue-50 text-blue-700 border border-blue-200",
                          civitas.category === 'warning' && "bg-amber-100 text-amber-800 border border-amber-200",
                          civitas.category === 'critical' && "bg-rose-100 text-rose-800 border border-rose-200"
                        )}>
                          {civitas.category === 'perfect' && 'Hadir Penuh'}
                          {civitas.category === 'good' && 'Disiplin'}
                          {civitas.category === 'warning' && 'Perlu Perhatian'}
                          {civitas.category === 'critical' && 'Perlu Pembinaan'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedCivitasDetail({
                              civitas,
                              attendedRecords: civitas.records,
                              attendedCount: civitas.physicalAttendedCount,
                              absentCount: civitas.absentUnits,
                              totalWeeks: civitas.totalUnits,
                              attendedWeeks: civitas.attendedUnits,
                              absenceRate: civitas.absenceRate,
                              weeklyBreakdown: civitas.weeklyBreakdown
                            });
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
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

      {/* 5. Modal Detail Presensi & Rincian Tiap Pekan */}
      {selectedCivitasDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Rincian Rekap Ketidakhadiran</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedCivitasDetail.civitas.name} ({selectedCivitasDetail.civitas.gender})
                  </p>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold border",
                    selectedCivitasDetail.civitas.employeeType === 'Bagian Umum'
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-indigo-100 text-indigo-800 border-indigo-300"
                  )}>
                    {selectedCivitasDetail.civitas.employeeType}
                  </span>
                </div>
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
                  <span className="block text-[11px] text-slate-500 font-medium">Total Pekan</span>
                  <span className="block text-lg font-bold text-slate-800">{selectedCivitasDetail.totalWeeks} Pekan</span>
                </div>
                <div>
                  <span className="block text-[11px] text-emerald-600 font-medium">Pekan Terpenuhi</span>
                  <span className="block text-lg font-bold text-emerald-700">{selectedCivitasDetail.attendedWeeks} Pekan</span>
                </div>
                <div>
                  <span className="block text-[11px] text-rose-600 font-medium">Pekan Absen</span>
                  <span className="block text-lg font-bold text-rose-700">{selectedCivitasDetail.absentCount} Pekan</span>
                </div>
              </div>

              {/* Rincian Pekan per Pekan */}
              {selectedCivitasDetail.weeklyBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <CalendarCheck size={14} className="text-emerald-600" />
                    Status Kehadiran Pekan per Pekan (Min 1x / Pekan)
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedCivitasDetail.weeklyBreakdown.map((wb) => (
                      <div 
                        key={wb.week.weekNumber} 
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between text-xs transition-colors",
                          wb.hasAttended
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-rose-50/50 border-rose-200"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {wb.week.label} ({wb.week.dateRangeLabel})
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {wb.hasAttended ? (
                              <span className="text-emerald-700 font-medium">
                                Hadir {wb.recordsInWeek.length}x pada pekan ini (hari lain tidak dihitung absen)
                              </span>
                            ) : (
                              <span className="text-rose-600 font-medium">
                                Tidak ada catatan presensi pada pekan ini (Dihitung 1x absen)
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={cn(
                          "px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1 shrink-0",
                          wb.hasAttended
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        )}>
                          {wb.hasAttended ? (
                            <>
                              <Check size={12} /> Terpenuhi
                            </>
                          ) : (
                            <>
                              <X size={12} /> Tidak Hadir
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sesi Kajian yang Dihadiri */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-emerald-600" />
                  Presensi Fisik yang Tercatat ({selectedCivitasDetail.attendedRecords.length})
                </h4>
                
                {selectedCivitasDetail.attendedRecords.length === 0 ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700">
                    Civitas ini <strong>belum pernah hadir</strong> pada sesi kajian mana pun dalam rentang periode ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedCivitasDetail.attendedRecords.map((r, i) => {
                      const schedule = schedules.find(s => s.id === r.scheduleId);
                      return (
                        <div key={r.id || i} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {format(parseISO(r.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              {schedule ? `${schedule.ustadz} - ${schedule.kitab}` : r.scheduleId}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Hadir
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCivitasDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
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
