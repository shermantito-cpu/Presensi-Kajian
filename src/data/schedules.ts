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
    kitab: 'Kitab Az-Zuhd War Raqaiq',
    time: '18:30',
  }
];
