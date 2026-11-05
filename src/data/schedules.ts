export interface Schedule {
  id: string;
  day: number; // 0 = Sunday, 1 = Monday, ..., 5 = Friday
  dayName: string;
  ustadz: string;
  kitab: string;
  time: string; // Typical Maghrib time roughly
}

export const schedules: Schedule[] = [
  {
    id: 'monday',
    day: 1,
    dayName: 'Senin',
    ustadz: 'Ustadz Hidayatullah',
    kitab: 'Kitab Bulughul Maram',
    time: '18:30', // Ba'da Maghrib
  },
  {
    id: 'tuesday',
    day: 2,
    dayName: 'Selasa',
    ustadz: 'Ustadz Rizki Saputra',
    kitab: 'Kajian Tafsir',
    time: '18:30',
  },
  {
    id: 'wednesday',
    day: 3,
    dayName: 'Rabu',
    ustadz: 'Ustadz Hidayatullah',
    kitab: 'Kitab Kun Salafiyan Alal Jaddah',
    time: '18:30',
  },
  {
    id: 'thursday',
    day: 4,
    dayName: 'Kamis',
    ustadz: 'Ustadz Arif Wicaksono',
    kitab: 'Kitab Az-Zuhd War Raqaiq',
    time: '18:30',
  },
  {
    id: 'friday',
    day: 5,
    dayName: "Jum'at",
    ustadz: 'Ustadz Vega Ilyasa',
    kitab: 'Kitab Arbain Nawawi',
    time: '18:30',
  }
];

export interface ActiveSessionResult {
  isOpen: boolean;
  schedule: Schedule | null;
  sessionDate: Date | null;
  sessionDateStr: string; // 'yyyy-MM-dd'
  closingDateTime: Date | null;
  closingTimeStr: string;
  statusMessage: string;
}

/**
 * Logika Batas Waktu Presensi Kajian (Tutup Pukul 17:30 WIB):
 * - Mulai pukul 17:30 WIB di hari kajian (Senin-Jum'at), presensi dibuka.
 * - Presensi tetap dibuka sampai keesokan harinya pukul 17:30 WIB (bukan 00:00 tengah malam).
 * - Tepat pukul 17:30 WIB keesokan harinya, presensi sesi tersebut ditutup dan berganti ke sesi berikutnya.
 * - Sesi Jum'at dibuka Jum'at 17:30 WIB dan ditutup Sabtu pukul 17:30 WIB.
 * - Sabtu 17:30 WIB s/d Senin 17:30 WIB libur akhir pekan (ditutup).
 */
export function getActiveKajianSession(date: Date = new Date()): ActiveSessionResult {
  const current = new Date(date);
  const hour = current.getHours();
  const minute = current.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  const cutoffMinutes = 17 * 60 + 30; // 17:30 = 1050 menit
  const day = current.getDay(); // 0 = Ahad, 1 = Senin, ..., 5 = Jum'at, 6 = Sabtu

  let sessionDate = new Date(current);
  let targetScheduleDay: number | null = null;
  let closingDateTime = new Date(current);

  if (timeInMinutes >= cutoffMinutes) {
    // Pukul 17:30 ke atas: Sesi kajian hari ini aktif (Senin - Jum'at)
    if (day >= 1 && day <= 5) {
      targetScheduleDay = day;
      sessionDate = new Date(current);
      // Ditutup besok pukul 17:30
      closingDateTime = new Date(current);
      closingDateTime.setDate(closingDateTime.getDate() + 1);
      closingDateTime.setHours(17, 30, 0, 0);
    }
  } else {
    // Sebelum 17:30: Masih membuka sesi kajian kemarin (jika kemarin Senin - Jum'at)
    // Berlaku untuk hari Selasa (day=2) s/d Sabtu (day=6)
    if (day >= 2 && day <= 6) {
      targetScheduleDay = day - 1;
      sessionDate = new Date(current);
      sessionDate.setDate(sessionDate.getDate() - 1);
      // Ditutup hari ini pukul 17:30
      closingDateTime = new Date(current);
      closingDateTime.setHours(17, 30, 0, 0);
    }
  }

  if (targetScheduleDay === null) {
    return {
      isOpen: false,
      schedule: null,
      sessionDate: null,
      sessionDateStr: '',
      closingDateTime: null,
      closingTimeStr: '',
      statusMessage: 'Presensi kajian saat ini ditutup. Sesi kajian berikutnya akan dibuka pada hari Senin pukul 17:30 WIB.'
    };
  }

  const schedule = schedules.find(s => s.day === targetScheduleDay) || null;
  const sessionDateStr = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
  
  const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const closeDayName = dayNames[closingDateTime.getDay()];
  const closeDateNum = closingDateTime.getDate();
  const closeMonthName = monthNames[closingDateTime.getMonth()];
  const closeYear = closingDateTime.getFullYear();
  const closingTimeStr = `${closeDayName}, ${closeDateNum} ${closeMonthName} ${closeYear} pukul 17:30 WIB`;

  return {
    isOpen: true,
    schedule,
    sessionDate,
    sessionDateStr,
    closingDateTime,
    closingTimeStr,
    statusMessage: `Batas pengisian presensi: ${closingTimeStr}`
  };
}
