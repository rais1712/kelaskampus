export interface TryoutQuestion {
  id: string;
  nomor: number;
  teks_soal: string;
  gambar_url?: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  topik: string;
}

export interface MockTryoutData {
  id: string;
  nama_tryout: string;
  durasi_menit: number;
  total_soal: number;
  questions: TryoutQuestion[];
  jawaban_benar: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'>;
}

export const mockTryoutData: MockTryoutData = {
  id: 'tryout-1',
  nama_tryout: 'Tryout SNBT 2026 - Menuju PTN Impianmu!',
  durasi_menit: 90,
  total_soal: 50,
  jawaban_benar: {
    '1': 'B',
    '2': 'A',
    '3': 'C',
    '4': 'D',
    '5': 'A',
    '6': 'B',
    '7': 'C',
    '8': 'E',
    '9': 'A',
    '10': 'D',
    '11': 'B',
    '12': 'C',
    '13': 'A',
    '14': 'E',
    '15': 'D',
    '16': 'B',
    '17': 'A',
    '18': 'C',
    '19': 'E',
    '20': 'D',
    '21': 'A',
    '22': 'B',
    '23': 'C',
    '24': 'D',
    '25': 'E',
    '26': 'A',
    '27': 'B',
    '28': 'C',
    '29': 'D',
    '30': 'E',
    '31': 'A',
    '32': 'B',
    '33': 'C',
    '34': 'D',
    '35': 'E',
    '36': 'A',
    '37': 'B',
    '38': 'C',
    '39': 'D',
    '40': 'E',
    '41': 'A',
    '42': 'B',
    '43': 'C',
    '44': 'D',
    '45': 'E',
    '46': 'A',
    '47': 'B',
    '48': 'C',
    '49': 'D',
    '50': 'E'
  },
  questions: [
    {
      id: '1',
      nomor: 1,
      teks_soal: 'Apa fungsi utama mitokondria dalam sel?',
      topik: 'Biologi',
      opsi_a: 'Fotosintesis',
      opsi_b: 'Produksi energi (ATP)',
      opsi_c: 'Sintesis protein',
      opsi_d: 'Penyimpanan genetik',
      opsi_e: 'Pencernaan intraseluler'
    },
    {
      id: '2',
      nomor: 2,
      teks_soal: 'Siapa yang menemukan hukum gravitasi?',
      topik: 'Fisika',
      opsi_a: 'Isaac Newton',
      opsi_b: 'Albert Einstein',
      opsi_c: 'Galileo Galilei',
      opsi_d: 'Stephen Hawking',
      opsi_e: 'Nikola Tesla'
    },
    {
      id: '3',
      nomor: 3,
      teks_soal: 'Berapakah hasil dari 15 × 12?',
      topik: 'Matematika',
      opsi_a: '160',
      opsi_b: '170',
      opsi_c: '180',
      opsi_d: '190',
      opsi_e: '200'
    },
    {
      id: '4',
      nomor: 4,
      teks_soal: 'Apa ibu kota Indonesia?',
      topik: 'Geografi',
      opsi_a: 'Bandung',
      opsi_b: 'Surabaya',
      opsi_c: 'Medan',
      opsi_d: 'Jakarta',
      opsi_e: 'Yogyakarta'
    },
    {
      id: '5',
      nomor: 5,
      teks_soal: 'Siapa presiden pertama Indonesia?',
      topik: 'Sejarah',
      opsi_a: 'Ir. Soekarno',
      opsi_b: 'Mohammad Hatta',
      opsi_c: 'Soeharto',
      opsi_d: 'B.J. Habibie',
      opsi_e: 'Megawati Soekarnoputri'
    },
    {
      id: '6',
      nomor: 6,
      teks_soal: 'Rumus kimia air adalah?',
      topik: 'Kimia',
      opsi_a: 'CO2',
      opsi_b: 'H2O',
      opsi_c: 'NaCl',
      opsi_d: 'O2',
      opsi_e: 'H2SO4'
    },
    {
      id: '7',
      nomor: 7,
      teks_soal: 'Planet terbesar di tata surya adalah?',
      topik: 'Astronomi',
      opsi_a: 'Mars',
      opsi_b: 'Bumi',
      opsi_c: 'Jupiter',
      opsi_d: 'Saturnus',
      opsi_e: 'Neptunus'
    },
    {
      id: '8',
      nomor: 8,
      teks_soal: 'Apa bahasa pemrograman yang paling populer untuk web development?',
      topik: 'Teknologi',
      opsi_a: 'Python',
      opsi_b: 'Java',
      opsi_c: 'C++',
      opsi_d: 'Ruby',
      opsi_e: 'JavaScript'
    },
    {
      id: '9',
      nomor: 9,
      teks_soal: 'Berapa jumlah provinsi di Indonesia saat ini?',
      topik: 'Geografi',
      opsi_a: '38',
      opsi_b: '34',
      opsi_c: '36',
      opsi_d: '40',
      opsi_e: '32'
    },
    {
      id: '10',
      nomor: 10,
      teks_soal: 'Apa singkatan dari DNA?',
      topik: 'Biologi',
      opsi_a: 'Deoxyribose Nucleic Acid',
      opsi_b: 'Diribonucleic Acid',
      opsi_c: 'Deoxyribonucleic Amino',
      opsi_d: 'Deoxyribonucleic Acid',
      opsi_e: 'Dioxiribonucleic Acid'
    },
    {
      id: '11',
      nomor: 11,
      teks_soal: 'Siapa penulis novel "Laskar Pelangi"?',
      topik: 'Bahasa Indonesia',
      opsi_a: 'Pramoedya Ananta Toer',
      opsi_b: 'Andrea Hirata',
      opsi_c: 'Habiburrahman El Shirazy',
      opsi_d: 'Dee Lestari',
      opsi_e: 'Tere Liye'
    },
    {
      id: '12',
      nomor: 12,
      teks_soal: 'Berapa hasil dari akar kuadrat 144?',
      topik: 'Matematika',
      opsi_a: '10',
      opsi_b: '11',
      opsi_c: '12',
      opsi_d: '13',
      opsi_e: '14'
    },
    {
      id: '13',
      nomor: 13,
      teks_soal: 'Apa nama laut terluas di dunia?',
      topik: 'Geografi',
      opsi_a: 'Samudra Pasifik',
      opsi_b: 'Samudra Atlantik',
      opsi_c: 'Samudra Hindia',
      opsi_d: 'Laut Mediterania',
      opsi_e: 'Laut Karibia'
    },
    {
      id: '14',
      nomor: 14,
      teks_soal: 'Kapan Indonesia merdeka?',
      topik: 'Sejarah',
      opsi_a: '17 Agustus 1944',
      opsi_b: '17 Agustus 1946',
      opsi_c: '17 Agustus 1947',
      opsi_d: '17 Agustus 1948',
      opsi_e: '17 Agustus 1945'
    },
    {
      id: '15',
      nomor: 15,
      teks_soal: 'Apa simbol kimia untuk emas?',
      topik: 'Kimia',
      opsi_a: 'Ag',
      opsi_b: 'Fe',
      opsi_c: 'Cu',
      opsi_d: 'Au',
      opsi_e: 'Pb'
    },
    {
      id: '16',
      nomor: 16,
      teks_soal: 'Siapa ilmuwan yang mengembangkan teori relativitas?',
      topik: 'Fisika',
      opsi_a: 'Isaac Newton',
      opsi_b: 'Albert Einstein',
      opsi_c: 'Galileo Galilei',
      opsi_d: 'Marie Curie',
      opsi_e: 'Niels Bohr'
    },
    {
      id: '17',
      nomor: 17,
      teks_soal: 'Apa organ terbesar pada tubuh manusia?',
      topik: 'Biologi',
      opsi_a: 'Kulit',
      opsi_b: 'Hati',
      opsi_c: 'Jantung',
      opsi_d: 'Paru-paru',
      opsi_e: 'Otak'
    },
    {
      id: '18',
      nomor: 18,
      teks_soal: 'Berapa nilai phi (π) yang mendekati?',
      topik: 'Matematika',
      opsi_a: '3.12',
      opsi_b: '3.13',
      opsi_c: '3.14',
      opsi_d: '3.15',
      opsi_e: '3.16'
    },
    {
      id: '19',
      nomor: 19,
      teks_soal: 'Apa nama mata uang Jepang?',
      topik: 'Ekonomi',
      opsi_a: 'Won',
      opsi_b: 'Yuan',
      opsi_c: 'Baht',
      opsi_d: 'Ringgit',
      opsi_e: 'Yen'
    },
    {
      id: '20',
      nomor: 20,
      teks_soal: 'Siapa pelukis terkenal yang melukis Monalisa?',
      topik: 'Seni',
      opsi_a: 'Vincent van Gogh',
      opsi_b: 'Pablo Picasso',
      opsi_c: 'Michelangelo',
      opsi_d: 'Leonardo da Vinci',
      opsi_e: 'Rembrandt'
    },
    ...Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 21),
      nomor: i + 21,
      teks_soal: `Soal nomor ${i + 21}: Ini adalah pertanyaan untuk menguji pemahaman Anda tentang materi ${['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Sejarah'][i % 5]}.`,
      topik: ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Sejarah'][i % 5],
      opsi_a: `Pilihan A untuk soal ${i + 21}`,
      opsi_b: `Pilihan B untuk soal ${i + 21}`,
      opsi_c: `Pilihan C untuk soal ${i + 21}`,
      opsi_d: `Pilihan D untuk soal ${i + 21}`,
      opsi_e: `Pilihan E untuk soal ${i + 21}`
    }))
  ]
};
