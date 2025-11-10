export interface Package {
  id: string;
  name: string;
  price: number;
  original_price: number;
  duration: number;
  tryout_count: number;
  benefits: string[];
  is_popular?: boolean;
}

export const mockPackages: Package[] = [
  {
    id: 'pkg-1',
    name: 'Paket Latihan Dasar',
    original_price: 150000,
    price: 75000,
    duration: 1,
    tryout_count: 6,
    benefits: [
      'Cocok buat kamu yang mau persiapan dulu',
      'Pembahasan telap tiap soal',
      'Ringkasan materi per tiap topik',
      'Leaderboard (Jurusan Regional)',
      'Progress report basic (skor & waktu)'
    ]
  },
  {
    id: 'pkg-2',
    name: 'Paket Siap Tempur',
    original_price: 200000,
    price: 100000,
    duration: 2,
    tryout_count: 15,
    benefits: [
      'Untuk yang butuh lebih maju +',
      'Benefit di Paket sebelumnya',
      'Bank soal latihan berkualitas',
      'Mini Quiz harian dan Penginat',
      'Leaderboard Nasional'
    ]
  },
  {
    id: 'pkg-3',
    name: 'Paket Juara Kampus',
    original_price: 300000,
    price: 150000,
    duration: 3,
    tryout_count: 30,
    benefits: [
      'Paket paling lengkap buat ngasah mental baja',
      'Benefit di Paket sebelumnya',
      'Deep Smart Analysis',
      'Live Clinic 4x/bulan',
      'Progress report detail'
    ],
    is_popular: true
  },
  {
    id: 'pkg-4',
    name: 'Paket Kampus Master',
    original_price: 500000,
    price: 200000,
    duration: 6,
    tryout_count: 50,
    benefits: [
      'Paket ultra sempurna buat yang mau all in hari ini',
      'Benefit di Paket sebelumnya',
      'Rencana Belajar Adaptif Harian (AI)',
      'Clinic 1:1 Mingguan',
      'Priority Support & SOS Chat'
    ]
  }
];
