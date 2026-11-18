import React, { useMemo, useState } from 'react';
import { Archive, Download, Shuffle } from 'lucide-react';
import { ExamDocument, ShuffledVariant } from '../types';
import { exportVariantsZip, generateExamVariants } from '../services/examShuffler';
import { exportExamToWord } from '../services/wordExport';
import { MathText } from '../components/MathText';
import { useToast } from '../components/ToastProvider';

interface ShufflerPageProps {
  exams: ExamDocument[];
  activeExam: ExamDocument;
}

export const ShufflerPage: React.FC<ShufflerPageProps> = ({ exams, activeExam }) => {
  const toast = useToast();
  const validExams = useMemo(() => {
    const list = exams.filter((e) => !e.isDeleted);
    if (!list.some((e) => e.id === activeExam.id)) return [activeExam, ...list];
    return list;
  }, [exams, activeExam]);

  const [selectedExamId, setSelectedExamId] = useState(activeExam.id);
  const [variantCount, setVariantCount] = useState(4);
  const [startCode, setStartCode] = useState(101);
  const [shuffleQuestionOrder, setShuffleQuestionOrder] = useState(true);
  const [shuffleMcqOptions, setShuffleMcqOptions] = useState(true);
  const [shuffleTrueFalseItems, setShuffleTrueFalseItems] = useState(false);
  const [keepDiagramQuestionsFixed, setKeepDiagramQuestionsFixed] = useState(false);

  const [variants, setVariants] = useState<ShuffledVariant[]>([]);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [zipBusy, setZipBusy] = useState(false);

  const targetExam = validExams.find((e) => e.id === selectedExamId) || activeExam;

  const handleShuffle = () => {
    if (targetExam.questions.length === 0) {
      toast.warning('Đề kiểm tra này chưa có câu hỏi nào để trộn.');
      return;
    }
    const codes = Array.from({ length: Math.max(1, Math.min(24, variantCount)) }, (_, i) =>
      String(startCode + i)
    );
    const result = generateExamVariants(targetExam, {
      variantCodes: codes,
      shuffleQuestionOrder,
      shuffleMcqOptions,
      shuffleTrueFalseItems,
      keepDiagramQuestionsFixed,
    });
    setVariants(result);
    setActiveVariantIdx(0);
    toast.success(`Đã tạo ${result.length} mã đề từ "${targetExam.title}".`);
  };

  const handleDownloadZip = async () => {
    if (variants.length === 0) return;
    setZipBusy(true);
    try {
      await exportVariantsZip(targetExam, variants);
      toast.success(`Đã đóng gói ZIP gồm ${variants.length} mã đề và bảng đáp án Excel.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo gói ZIP mã đề.');
    } finally {
      setZipBusy(false);
    }
  };

  const currentVariant = variants[activeVariantIdx];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">
              Trộn đề kiểm tra nhiều mã đề
            </h1>
            <p className="text-base text-[#475569] mt-1">
              Tự động giữ nguyên các câu đã khóa, nhóm câu đọc hiểu/dùng chung ngữ liệu và phương án phụ thuộc thứ tự (&quot;Tất cả các phương án trên&quot;).
            </p>
          </div>
          {variants.length > 0 && (
            <button
              type="button"
              disabled={zipBusy}
              onClick={handleDownloadZip}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 min-h-[44px] text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <Archive className="w-5 h-5" />
              {zipBusy ? 'Đang đóng gói ZIP...' : `Tải trọn bộ ${variants.length} mã đề (.zip)`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Chọn đề gốc
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base"
            >
              {validExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.questions.length} câu)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Số lượng mã đề
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={variantCount}
              onChange={(e) => setVariantCount(Number(e.target.value) || 4)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Mã đề bắt đầu
            </label>
            <input
              type="number"
              value={startCode}
              onChange={(e) => setStartCode(Number(e.target.value) || 101)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base tabular-nums"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleShuffle}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 min-h-[46px] text-base font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
            >
              <Shuffle className="w-5 h-5" />
              Tạo {variantCount} mã đề
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 pt-1 text-base text-[#334155]">
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestionOrder}
              onChange={(e) => setShuffleQuestionOrder(e.target.checked)}
              className="w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB]"
            />
            Trộn thứ tự câu hỏi trong từng phần
          </label>
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleMcqOptions}
              onChange={(e) => setShuffleMcqOptions(e.target.checked)}
              className="w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB]"
            />
            Trộn phương án A, B, C, D (trừ phương án cố định)
          </label>
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleTrueFalseItems}
              onChange={(e) => setShuffleTrueFalseItems(e.target.checked)}
              className="w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB]"
            />
            Trộn các ý a, b, c, d trong câu Đúng/Sai
          </label>
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={keepDiagramQuestionsFixed}
              onChange={(e) => setKeepDiagramQuestionsFixed(e.target.checked)}
              className="w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB]"
            />
            Giữ nguyên vị trí câu có hình vẽ
          </label>
        </div>
      </div>

      {variants.length > 0 && currentVariant && (
        <div className="space-y-5">
          {/* Variant Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl">
              {variants.map((v, idx) => (
                <button
                  key={v.examCode}
                  type="button"
                  onClick={() => setActiveVariantIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-[15px] font-semibold tabular-nums cursor-pointer ${
                    activeVariantIdx === idx
                      ? 'bg-white text-[#2563EB] shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  Mã đề {v.examCode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={async () => {
                await exportExamToWord(
                  {
                    ...targetExam,
                    header: { ...targetExam.header, examCode: currentVariant.examCode },
                    questions: currentVariant.questions,
                  },
                  'exam_with_answers'
                );
                toast.success(`Đã tải Word Mã đề ${currentVariant.examCode}.`);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#2563EB]" />
              Tải Word Mã {currentVariant.examCode}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Answer Key & Mapping Table */}
            <div className="lg:col-span-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-3 shadow-xs">
              <h2 className="text-[19px] font-bold text-[#0F172A]">
                Bảng đáp án & Ánh xạ Mã đề {currentVariant.examCode}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px] sm:text-[15px] border-collapse border border-[#CBD5E1]">
                  <thead>
                    <tr className="bg-[#F5F7FB]">
                      <th className="border border-[#CBD5E1] py-2.5 px-2.5">Câu mới</th>
                      <th className="border border-[#CBD5E1] py-2.5 px-2.5">Câu gốc</th>
                      <th className="border border-[#CBD5E1] py-2.5 px-2.5">Đáp án</th>
                      <th className="border border-[#CBD5E1] py-2.5 px-2.5">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVariant.answerKey.map((k) => (
                      <tr key={k.questionId} className="text-center tabular-nums">
                        <td className="border border-[#CBD5E1] py-2 px-2.5 font-semibold">
                          Câu {k.variantNumber}
                        </td>
                        <td className="border border-[#CBD5E1] py-2 px-2.5 text-[#475569]">
                          Gốc #{k.originalNumber}
                        </td>
                        <td className="border border-[#CBD5E1] py-2 px-2.5 font-bold text-[#16A34A]">
                          <MathText text={k.correctAnswer} />
                        </td>
                        <td className="border border-[#CBD5E1] py-2 px-2.5">{k.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview Questions (Preserves .exam-paper Times New Roman 13pt) */}
            <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-3 exam-paper shadow-xs">
              <div className="text-center font-bold border-b border-slate-300 pb-2">
                {targetExam.header.examTitle} — MÃ ĐỀ {currentVariant.examCode}
              </div>
              {currentVariant.questions.map((q, idx) => (
                <div key={q.id} className="space-y-1">
                  <div>
                    <strong>Câu {idx + 1}: </strong>
                    <MathText text={q.stem} />
                  </div>
                  {q.options && (
                    <div className="grid grid-cols-2 gap-x-4 pl-4 text-[12pt]">
                      {['A', 'B', 'C', 'D'].map((lbl, i) => (
                        <div key={lbl}>
                          <strong>{lbl}. </strong>
                          <MathText text={q.options?.[i] || ''} />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.trueFalseItems && (
                    <div className="pl-4 text-[12pt] space-y-0.5">
                      {q.trueFalseItems.map((it) => (
                        <div key={it.label}>
                          <strong>{it.label}) </strong>
                          <MathText text={it.statement} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
