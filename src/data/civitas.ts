export const ikhwanNames = [
  'Rahmat Dipuro',
  'Sulistiono',
  'Yuviter Pradeska',
  'Muchamad Firdaus',
  'Muhammad Fadll',
  'Muhammad Robby Putra',
  'Satrio Wibowo',
  'Aji Saputro',
  'Anggara Pratodi',
  'Bagus Kurniawan',
  'Tsabit Abu Najjah',
  'M. Nurcholis Saputra',
  'Muhammad Hapsendra',
  'Abdurrahman Rafiq',
  'Ujang Tri Saputra',
  'Ridho Tegar',
  'Jefi Mahendra',
  'Harbudi',
  'Kgs. Muhammad Fauzan',
  'Gusti Wijaya Santri',
  'Oktabri Selvin',
  'Kusdani',
  'Jauhari',
  'Sapardi',
  'Herman Siswanto',
  'Wahyu',
  'Noval Eka Wijaya',
  'Arif Hibatullah',
  'Ardyan Sananda',
  'Aziz Nopriansyah',
  'Dhenys Oka Ravael',
  'Tri Bayu',
  'Okti Napitupulu',
  'Alvin',
  'Agus Arwanto',
  'Mat Akhir',
  'Taufik Hidayat Usshohe',
  'Ommar Sharief',
  'M. Ilham',
  'Muhammad Rimbawan',
  'Rizki Saputra'
];

export const akhwatNames = [
  'Khairunnisa',
  'Tuti Rahayu',
  'Dian Nurvianti Wahyuni',
  'Khoriyyah',
  'Indah Anisya Nabila',
  'Bela Wulandari',
  'Julia Mandasari',
  'Meta Meyrliana Putri Wahyudi',
  'Nada Khairunnisa',
  'Rapika Agustina',
  'Adinda Putri Aisyah',
  'Widiarti Dwi Lestari'
];

export type Gender = 'Ikhwan' | 'Akhwat';

export interface Civitas {
  id: string;
  name: string;
  gender: Gender;
}

export const civitasData: Civitas[] = [
  ...ikhwanNames.map((name, index) => ({ id: `ikhwan-${index + 1}`, name, gender: 'Ikhwan' as Gender })),
  ...akhwatNames.map((name, index) => ({ id: `akhwat-${index + 1}`, name, gender: 'Akhwat' as Gender }))
].sort((a, b) => a.name.localeCompare(b.name));
