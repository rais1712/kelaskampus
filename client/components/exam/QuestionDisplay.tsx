// components/exam/QuestionDisplay.tsx

export interface Question {
  id: string;
  soal_id?: string;
  pertanyaan: string;  // ✅ FIXED
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e?: string;
  urutan?: number;
  jawaban_benar?: string;
}

interface Props {
  question: Question;
  currentAnswer?: string;
  onAnswerChange: (answer: string) => void;
  questionNumber: number;
  totalQuestions: number;
}

const OPTIONS = [
  { key: 'A', value: 'opsi_a' },
  { key: 'B', value: 'opsi_b' },
  { key: 'C', value: 'opsi_c' },
  { key: 'D', value: 'opsi_d' },
  { key: 'E', value: 'opsi_e' }
];

export default function QuestionDisplay({
  question,
  currentAnswer,
  onAnswerChange,
  questionNumber,
  totalQuestions
}: Props) {
  
  console.log('📍 QuestionDisplay rendered:', {
    questionNumber,
    questionId: question?.id,
    pertanyaan: question?.pertanyaan,
    currentAnswer
  });

  if (!question) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <p className="text-red-600">⚠️ Soal tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">
          Soal {questionNumber} dari {totalQuestions}
        </h2>
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {question.pertanyaan || '⚠️ Soal kosong'}
        </p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const optionText = question[option.value as keyof Question] as string;
          const isSelected = currentAnswer === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                console.log('🎯 Option clicked:', option.key);
                onAnswerChange(option.key);
              }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#295782] bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  isSelected
                    ? 'bg-[#295782] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.key}
                </div>
                <p className="text-gray-800 leading-relaxed flex-1 pt-1">
                  {optionText || '(kosong)'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
