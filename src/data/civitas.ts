export type Gender = 'Ikhwan' | 'Akhwat';
export type EmployeeType = 'Bagian Umum' | 'Pendidik dan Tenaga Kependidikan';

export interface Civitas {
  id: string;
  name: string;
  gender: Gender;
  employeeType: EmployeeType;
}

export const BAGIAN_UMUM_NAMES = [
  'Agus Arwanto',
  'Alvin',
  'Mat Akhir',
  'Arif Hibatullah',
  'Kusdani',
  'Okti Napitupulu',
  'Sapardi',
  'Ardyan Sananda',
  'Aziz Nopriansyah',
  'Gusti Wijaya Santri',
  'Herman Siswanto',
  'Noval Eka Wijaya',
  'Oktabri Selvin',
  'Taufik Hidayat Usshohe',
  'Wahyu'
];

export const getEmployeeType = (name: string): EmployeeType => {
  const cleanName = name.trim().toLowerCase();
  const isBagianUmum = BAGIAN_UMUM_NAMES.some(n => n.trim().toLowerCase() === cleanName);
  return isBagianUmum ? 'Bagian Umum' : 'Pendidik dan Tenaga Kependidikan';
};

export const ikhwanList: { id: string; name: string }[] = [
  { id: 'ikhwan-1', name: 'Rahmat Dipuro' },
  { id: 'ikhwan-2', name: 'Sulistiono' },
  { id: 'ikhwan-3', name: 'Yuviter Pradeska' },
  { id: 'ikhwan-4', name: 'Muchamad Firdaus' },
  { id: 'ikhwan-5', name: 'Muhammad Fadll' },
  { id: 'ikhwan-6', name: 'Muhammad Robby Putra' },
  { id: 'ikhwan-7', name: 'Satrio Wibowo' },
  { id: 'ikhwan-8', name: 'Aji Saputro' },
  { id: 'ikhwan-9', name: 'Anggara Pratodi' },
  { id: 'ikhwan-10', name: 'Bagus Kurniawan' },
  { id: 'ikhwan-11', name: 'Tsabit Abu Najjah' },
  { id: 'ikhwan-12', name: 'M. Nurcholis Saputra' },
  { id: 'ikhwan-13', name: 'Muhammad Hapsendra' },
  { id: 'ikhwan-14', name: 'Abdurrahman Rafiq' },
  { id: 'ikhwan-15', name: 'Ujang Tri Saputra' },
  { id: 'ikhwan-16', name: 'Ridho Tegar' },
  { id: 'ikhwan-17', name: 'Jefi Mahendra' },
  { id: 'ikhwan-18', name: 'Harbudi' },
  { id: 'ikhwan-19', name: 'Kgs. Muhammad Fauzan' },
  { id: 'ikhwan-20', name: 'Gusti Wijaya Santri' },
  { id: 'ikhwan-21', name: 'Oktabri Selvin' },
  { id: 'ikhwan-22', name: 'Kusdani' },
  { id: 'ikhwan-23', name: 'Jauhari' },
  { id: 'ikhwan-24', name: 'Sapardi' },
  { id: 'ikhwan-25', name: 'Herman Siswanto' },
  { id: 'ikhwan-26', name: 'Wahyu' },
  { id: 'ikhwan-27', name: 'Noval Eka Wijaya' },
  { id: 'ikhwan-28', name: 'Arif Hibatullah' },
  { id: 'ikhwan-29', name: 'Ardyan Sananda' },
  { id: 'ikhwan-30', name: 'Aziz Nopriansyah' },
  // ikhwan-31: Dhenys Oka Ravael (Dihapus)
  // ikhwan-32: Tri Bayu (Dihapus)
  { id: 'ikhwan-33', name: 'Okti Napitupulu' },
  { id: 'ikhwan-34', name: 'Alvin' },
  { id: 'ikhwan-35', name: 'Agus Arwanto' },
  { id: 'ikhwan-36', name: 'Mat Akhir' },
  { id: 'ikhwan-37', name: 'Taufik Hidayat Usshohe' },
  { id: 'ikhwan-38', name: 'Ommar Sharief' },
  { id: 'ikhwan-39', name: 'M. Ilham' },
  { id: 'ikhwan-40', name: 'Muhammad Rimbawan' },
  { id: 'ikhwan-41', name: 'Rizki Saputra' }
];

export const akhwatList: { id: string; name: string }[] = [
  { id: 'akhwat-1', name: 'Khairunnisa' },
  { id: 'akhwat-2', name: 'Tuti Rahayu' },
  { id: 'akhwat-3', name: 'Dian Nurvianti Wahyuni' },
  { id: 'akhwat-4', name: 'Khoriyyah' },
  { id: 'akhwat-5', name: 'Indah Anisya Nabila' },
  { id: 'akhwat-6', name: 'Bela Wulandari' },
  { id: 'akhwat-7', name: 'Julia Mandasari' },
  { id: 'akhwat-8', name: 'Meta Meyrliana Putri Wahyudi' },
  { id: 'akhwat-9', name: 'Nada Khairunnisa' },
  { id: 'akhwat-10', name: 'Rapika Agustina' },
  { id: 'akhwat-11', name: 'Adinda Putri Aisyah' },
  { id: 'akhwat-12', name: 'Widiarti Dwi Lestari' }
];

export const ikhwanNames = ikhwanList.map(item => item.name);
export const akhwatNames = akhwatList.map(item => item.name);

export const civitasData: Civitas[] = [
  ...ikhwanList.map(item => ({ ...item, gender: 'Ikhwan' as Gender, employeeType: getEmployeeType(item.name) })),
  ...akhwatList.map(item => ({ ...item, gender: 'Akhwat' as Gender, employeeType: getEmployeeType(item.name) }))
].sort((a, b) => a.name.localeCompare(b.name));
