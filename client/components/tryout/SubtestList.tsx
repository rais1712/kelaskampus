// components/tryout/SubtestList.tsx

import { Play, CheckCircle, Clock, Lock } from 'lucide-react';

interface Kategori {
  kategori_id: string;
  kode_kategori: string;
  nama_kategori: string;
  jumlah_soal?: number;
  durasi_menit?: number;
}

interface ProgressData {
  [kategoriId: string]: {
    answered: number;
    total: number;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}

interface SubtestListProps {
  groupedKategoris: Record<string, Kategori[]>;
  progressData: ProgressData;
  onStartSubtest: (kategoriId: string) => void;
  canStart: boolean;
  isStarting: boolean;
  completedKategoris?: Set<string>;
  isSubmitted?: boolean;  // ✅ NEW PROP
}

export default function SubtestList({
  groupedKategoris,
  progressData,
  onStartSubtest,
  canStart,
  isStarting,
  completedKategoris,
  isSubmitted = false  // ✅ DEFAULT FALSE
}: SubtestListProps) {
  
  const getStatusBadge = (kategori: Kategori) => {
    const progress = progressData[kategori.kategori_id];
    const isCompleted = completedKategoris?.has(kategori.kategori_id);

    if (isCompleted || progress?.status === 'completed') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />
          Selesai
        </div>
      );
    }

    if (progress?.status === 'in_progress') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Sedang Dikerjakan
        </div>
      );
    }

    return (
      <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
        Belum Dimulai
      </div>
    );
  };

  const getButtonState = (kategori: Kategori) => {
    const progress = progressData[kategori.kategori_id];
    const isCompleted = completedKategoris?.has(kategori.kategori_id);

    // ✅ If tryout submitted, all buttons disabled
    if (isSubmitted) {
      return {
        text: 'Terkunci',
        icon: Lock,
        disabled: true,
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed'
      };
    }

    if (isCompleted || progress?.status === 'completed') {
      return {
        text: 'Lihat Jawaban',
        icon: CheckCircle,
        disabled: false,
        className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
      };
    }

    if (progress?.status === 'in_progress') {
      return {
        text: 'Lanjutkan',
        icon: Play,
        disabled: !canStart,
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
      };
    }

    return {
      text: 'Mulai',
      icon: Play,
      disabled: !canStart,
      className: 'bg-gradient-to-r from-[#295782] to-[#89b0c7] text-white hover:shadow-lg'
    };
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedKategoris).map(([groupName, kategoris]) => (
        <div key={groupName} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#1d293d] mb-4">{groupName}</h2>
          
          <div className="space-y-3">
            {kategoris.map((kategori) => {
              const progress = progressData[kategori.kategori_id];
              const buttonState = getButtonState(kategori);
              const ButtonIcon = buttonState.icon;

              return (
                <div
                  key={kategori.kategori_id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    isSubmitted 
                      ? 'border-gray-200 bg-gray-50' 
                      : 'border-gray-200 hover:border-[#295782]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold ${isSubmitted ? 'text-gray-500' : 'text-[#1d293d]'}`}>
                          {kategori.nama_kategori}
                        </h3>
                        {getStatusBadge(kategori)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-[#62748e]">
                        <span>{kategori.jumlah_soal || 0} soal</span>
                        <span>•</span>
                        <span>{kategori.durasi_menit || 0} menit</span>
                        {progress && progress.answered > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">
                              {progress.answered}/{progress.total} terjawab
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => !buttonState.disabled && onStartSubtest(kategori.kode_kategori)}
                      disabled={buttonState.disabled || isStarting}
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${buttonState.className} ${
                        buttonState.disabled || isStarting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ButtonIcon className="w-4 h-4" />
                      {isStarting ? 'Memuat...' : buttonState.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
