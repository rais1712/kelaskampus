import { Button } from '@/components/ui/button';
import { Flag, FlagOff } from 'lucide-react';

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answers: Record<number, string | null>;
  flaggedQuestions: Record<number, boolean>;
  onQuestionClick: (questionNumber: number) => void;
  onToggleFlag: () => void;
  isFlagged: boolean;
}

export function QuestionNav({
  totalQuestions,
  currentQuestion,
  answers,
  flaggedQuestions,
  onQuestionClick,
  onToggleFlag,
  isFlagged
}: QuestionNavProps) {
  const getButtonClass = (questionNum: number): string => {
    const isCurrentQuestion = questionNum === currentQuestion;
    const isAnswered = answers[questionNum] !== undefined && answers[questionNum] !== null;
    const isFlaggedQ = flaggedQuestions[questionNum];

    if (isCurrentQuestion) {
      return 'bg-[#295782] text-white hover:bg-[#295782]/90';
    }
    if (isAnswered) {
      return 'bg-green-500 text-white hover:bg-green-600';
    }
    if (isFlaggedQ) {
      return 'bg-yellow-400 text-gray-900 hover:bg-yellow-500';
    }
    return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col gap-4 min-w-[280px]">
      <Button
        onClick={onToggleFlag}
        className={`w-full ${
          isFlagged
            ? 'bg-[#6a7282] hover:bg-[#6a7282]/90'
            : 'bg-[#89B0C7] hover:bg-[#89B0C7]/90'
        } text-white`}
      >
        {isFlagged ? (
          <>
            <FlagOff className="w-4 h-4 mr-2" />
            Batal Tandai Soal
          </>
        ) : (
          <>
            <Flag className="w-4 h-4 mr-2" />
            Tandai Soal
          </>
        )}
      </Button>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => (
          <Button
            key={num}
            onClick={() => onQuestionClick(num)}
            className={`w-10 h-10 p-0 rounded-lg text-sm font-medium ${getButtonClass(num)}`}
          >
            {num}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#295782] rounded"></div>
          <span className="text-gray-600">Soal saat ini</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Sudah dijawab</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span className="text-gray-600">Ditandai</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span className="text-gray-600">Belum dijawab</span>
        </div>
      </div>
    </div>
  );
}
