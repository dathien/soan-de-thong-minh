import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ExamDocument } from '../types';
import { MathText } from './MathText';

interface PresentationModeProps {
  exam: ExamDocument;
  onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ exam, onClose }) => {
  const questions = exam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontScale, setFontScale] = useState(1.25);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(exam.durationMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const currentQ = questions[currentIndex];
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const goPrev = () => {
    setShowAnswer(false);
    setShowSolution(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    setShowAnswer(false);
    setShowSolution(false);
    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
  };

  const goRandom = () => {
    if (questions.length <= 1) return;
    setShowAnswer(false);
    setShowSolution(false);
    let next = currentIndex;
    while (next === currentIndex) {
      next = Math.floor(Math.random() * questions.length);
    }
    setCurrentIndex(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-3.5 bg-slate-900">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-white truncate">{exam.title}</div>
          <div className="text-[14px] text-slate-400">
            Môn {exam.subject} · Lớp {exam.grade} · Câu {currentIndex + 1}/{questions.length}
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono-tabular text-xl font-bold text-sky-300 px-3.5 py-1.5 rounded-lg bg-slate-800">
            {mins}:{secs}
          </span>
          <button
            type="button"
            onClick={() => setTimerRunning((r) => !r)}
            className="min-h-[40px] rounded-xl bg-slate-800 px-3.5 py-2 text-[14px] font-medium hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimerRunning(false);
              setSecondsLeft(exam.durationMinutes * 60);
            }}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl bg-slate-800 p-2 hover:bg-slate-700"
            title="Đặt lại đồng hồ"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-[14px] font-medium hover:bg-slate-700"
        >
          <X className="w-4 h-4" />
          Thoát trình chiếu
        </button>
      </div>

      {/* Main Slide Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16 flex flex-col justify-center max-w-5xl mx-auto w-full">
        {currentQ ? (
          <div
            className="rounded-2xl bg-white text-slate-900 p-6 md:p-10 shadow-2xl space-y-5"
            style={{ fontSize: `${fontScale}rem`, lineHeight: 1.55 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm font-sans text-slate-600">
              <span className="font-bold text-blue-800">
                Câu {currentIndex + 1} ({currentQ.points} điểm)
              </span>
            </div>

            {currentQ.sharedPassage && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-[0.9em] italic text-slate-700">
                <MathText text={currentQ.sharedPassage} />
              </div>
            )}

            <div className="font-serif text-slate-900">
              <MathText text={currentQ.stem} />
            </div>

            {currentQ.diagram?.svgMarkup && (
              <div
                className="flex justify-center py-2"
                dangerouslySetInnerHTML={{ __html: currentQ.diagram.svgMarkup }}
              />
            )}

            {currentQ.type === 'mcq' && currentQ.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-serif">
                {['A', 'B', 'C', 'D'].map((lbl, idx) => {
                  const isCorrect =
                    showAnswer && currentQ.correctAnswer.trim().toUpperCase() === lbl;
                  return (
                    <div
                      key={lbl}
                      className={`rounded-xl border px-4 py-2.5 transition-colors ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <span className="font-bold mr-2">{lbl}.</span>
                      <MathText text={currentQ.options?.[idx] || ''} />
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.type === 'true_false' && currentQ.trueFalseItems && (
              <div className="space-y-2 pt-2 font-serif">
                {currentQ.trueFalseItems.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"
                  >
                    <div>
                      <span className="font-bold mr-2">{it.label})</span>
                      <MathText text={it.statement} />
                    </div>
                    {showAnswer && (
                      <span
                        className={`font-sans text-sm font-bold shrink-0 ${
                          it.isTrue ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {it.isTrue ? 'Đúng' : 'Sai'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAnswer && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-sans text-emerald-900">
                <strong>Đáp án: </strong>
                <MathText text={currentQ.correctAnswer || 'Chưa cập nhật'} />
              </div>
            )}

            {showSolution && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-base font-sans text-slate-800">
                <strong>Lời giải / Hướng dẫn chấm: </strong>
                <MathText text={currentQ.explanation || 'Chưa có lời giải chi tiết.'} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-400">Chưa có câu hỏi để trình chiếu.</div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-6 py-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFontScale((s) => Math.max(0.9, Number((s - 0.1).toFixed(2))))}
            className="min-h-[42px] rounded-xl bg-slate-800 px-3.5 py-2 text-[14px] font-medium hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            <ZoomOut className="w-4 h-4" />
            Giảm cỡ chữ
          </button>
          <button
            type="button"
            onClick={() => setFontScale((s) => Math.min(2.2, Number((s + 0.1).toFixed(2))))}
            className="min-h-[42px] rounded-xl bg-slate-800 px-3.5 py-2 text-[14px] font-medium hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            <ZoomIn className="w-4 h-4" />
            Tăng cỡ chữ
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="min-h-[42px] rounded-xl bg-slate-800 px-4 py-2 text-[14px] font-medium hover:bg-slate-700 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Câu trước
          </button>
          <button
            type="button"
            onClick={goRandom}
            disabled={questions.length <= 1}
            className="min-h-[42px] rounded-xl bg-slate-800 px-4 py-2 text-[14px] font-medium hover:bg-slate-700 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Shuffle className="w-4 h-4" />
            Ngẫu nhiên
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex >= questions.length - 1}
            className="min-h-[42px] rounded-xl bg-[#2563EB] px-4 py-2 text-[14px] font-semibold hover:bg-[#1E40AF] disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            Câu sau
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            className="min-h-[42px] rounded-xl bg-slate-800 px-4 py-2 text-[14px] font-medium hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
          </button>
          <button
            type="button"
            onClick={() => setShowSolution((v) => !v)}
            className="min-h-[42px] rounded-xl bg-slate-800 px-4 py-2 text-[14px] font-medium hover:bg-slate-700"
          >
            {showSolution ? 'Ẩn lời giải' : 'Hiện lời giải'}
          </button>
        </div>
      </div>
    </div>
  );
};
