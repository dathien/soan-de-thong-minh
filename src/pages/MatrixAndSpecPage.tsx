import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ExamDocument,
  ExamMatrix,
  ExamMatrixRow,
  ExamSpecification,
  ExamSpecificationRow,
  QuestionType,
  TextbookLesson,
} from '../types';
import { COGNITIVE_LEVEL_LABELS, QUESTION_TYPE_LABELS } from '../data/curriculum';
import { apiGenerateExam, apiGenerateMatrix } from '../services/aiClient';
import {
  exportMatrixToExcel,
  exportMatrixToWord,
  exportSpecToExcel,
  exportSpecToWord,
} from '../services/wordExport';
import { useToast } from '../components/ToastProvider';

interface MatrixAndSpecPageProps {
  initialTab: 'matrix' | 'specification';
  exam: ExamDocument;
  lessons: TextbookLesson[];
  matrix: ExamMatrix;
  spec: ExamSpecification;
  onSaveMatrix: (m: ExamMatrix) => Promise<void>;
  onSaveSpec: (s: ExamSpecification) => Promise<void>;
  onApplyQuestionsToExam: (
    questions: ExamDocument['questions'],
    sections: ExamDocument['sections']
  ) => void;
}

export const MatrixAndSpecPage: React.FC<MatrixAndSpecPageProps> = ({
  initialTab,
  exam,
  lessons,
  matrix,
  spec,
  onSaveMatrix,
  onSaveSpec,
  onApplyQuestionsToExam,
}) => {
  const toast = useToast();
  const [tab, setTab] = useState<'matrix' | 'specification'>(initialTab);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedLessons = useMemo(
    () => lessons.filter((l) => exam.sourceRef.lessonIds.includes(l.id)),
    [lessons, exam.sourceRef.lessonIds]
  );

  const totals = useMemo(() => {
    const nb = matrix.rows.reduce((s, r) => s + r.nbCount, 0);
    const th = matrix.rows.reduce((s, r) => s + r.thCount, 0);
    const vd = matrix.rows.reduce((s, r) => s + r.vdCount, 0);
    const vdc = matrix.rows.reduce((s, r) => s + r.vdcCount, 0);
    const pts = Math.round(matrix.rows.reduce((s, r) => s + r.points, 0) * 100) / 100;
    const pct = Math.round(matrix.rows.reduce((s, r) => s + r.percentage, 0) * 10) / 10;
    return { nb, th, vd, vdc, totalQ: nb + th + vd + vdc, pts, pct };
  }, [matrix.rows]);

  const examActualPoints =
    Math.round(exam.questions.reduce((s, q) => s + q.points, 0) * 100) / 100;
  const syncMismatch =
    totals.totalQ !== exam.questions.length || Math.abs(totals.pts - examActualPoints) > 0.01;

  const updateRow = (id: string, patch: Partial<ExamMatrixRow>) => {
    const nextRows = matrix.rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    onSaveMatrix({ ...matrix, rows: nextRows, updatedAt: new Date().toISOString() });
  };

  const addRow = () => {
    const firstLesson = selectedLessons[0];
    const row: ExamMatrixRow = {
      id: `mrow-${Date.now()}`,
      stt: matrix.rows.length + 1,
      chapterTitle: firstLesson?.chapterTitle || 'Chương I',
      contentArea: firstLesson?.lessonTitle || 'Nội dung kiến thức',
      knowledgeUnit: firstLesson?.knowledgeUnits[0]?.title || 'Đơn vị kiến thức 1',
      lessonId: firstLesson?.id,
      questionType: 'mcq',
      nbCount: 2,
      thCount: 1,
      vdCount: 1,
      vdcCount: 0,
      subItemCount: 0,
      points: 2,
      percentage: 20,
    };
    onSaveMatrix({
      ...matrix,
      rows: [...matrix.rows, row],
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteRow = (id: string) => {
    const nextRows = matrix.rows
      .filter((r) => r.id !== id)
      .map((r, i) => ({ ...r, stt: i + 1 }));
    onSaveMatrix({ ...matrix, rows: nextRows, updatedAt: new Date().toISOString() });
  };

  const generateSpecFromMatrix = async () => {
    const rows: ExamSpecificationRow[] = [];
    let qCursor = 1;
    let stt = 1;

    for (const mRow of matrix.rows) {
      const lesson = lessons.find((l) => l.id === mRow.lessonId);
      const outcomeText =
        lesson?.learningOutcomes.join('; ') || `Nắm vững và vận dụng ${mRow.knowledgeUnit}`;

      const levels: { code: 'NB' | 'TH' | 'VD' | 'VDC'; count: number }[] = [
        { code: 'NB', count: mRow.nbCount },
        { code: 'TH', count: mRow.thCount },
        { code: 'VD', count: mRow.vdCount },
        { code: 'VDC', count: mRow.vdcCount },
      ];

      for (const lv of levels) {
        if (lv.count <= 0) continue;
        const nums: string[] = [];
        for (let i = 0; i < lv.count; i++) {
          nums.push(`C${qCursor++}`);
        }
        rows.push({
          id: `srow-${Date.now()}-${stt}`,
          stt: stt++,
          chapterTitle: mRow.chapterTitle,
          knowledgeUnit: mRow.knowledgeUnit,
          learningOutcome: outcomeText,
          cognitiveLevel: lv.code,
          questionType: mRow.questionType,
          questionCount: lv.count,
          subItemCount: mRow.questionType === 'true_false' ? lv.count * 4 : 0,
          questionNumbers: nums.join(', '),
          lessonId: mRow.lessonId,
        });
      }
    }

    await onSaveSpec({
      ...spec,
      matrixId: matrix.id,
      examId: exam.id,
      title: matrix.title,
      subject: exam.subject,
      grade: exam.grade,
      rows,
      updatedAt: new Date().toISOString(),
    });
    setTab('specification');
    toast.success('Đã đồng bộ Bảng đặc tả từ Ma trận & nguồn SGK.');
  };

  const handleAiGenerateMatrix = async () => {
    setErrorMsg('');
    setAiLoading(true);
    try {
      const res = await apiGenerateMatrix({
        subject: exam.subject,
        grade: exam.grade,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        lessons: selectedLessons,
      });
      const rows: ExamMatrixRow[] = (res.rows || []).map((r, i) => ({
        ...r,
        id: `mrow-ai-${Date.now()}-${i}`,
        stt: i + 1,
        questionType: (r.questionType as QuestionType) || 'mcq',
        subItemCount: r.subItemCount || 0,
      }));
      await onSaveMatrix({
        ...matrix,
        subject: exam.subject,
        grade: exam.grade,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        rows,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Đã lập ma trận gồm ${rows.length} dòng kiến thức.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo ma trận bằng AI.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateExamFromMatrix = async () => {
    if (matrix.rows.length === 0) {
      setErrorMsg('Ma trận chưa có dòng nào.');
      return;
    }
    setErrorMsg('');
    setAiLoading(true);
    try {
      const matrixSummary = matrix.rows
        .map(
          (r) =>
            `${r.chapterTitle} - ${r.knowledgeUnit} (${QUESTION_TYPE_LABELS[r.questionType]}): NB=${r.nbCount}, TH=${r.thCount}, VD=${r.vdCount}, VDC=${r.vdcCount}, Tổng điểm=${r.points}`
        )
        .join('\n');

      const res = await apiGenerateExam({
        prompt: `Tạo đề kiểm tra khớp CHÍNH XÁC theo ma trận sau:\n${matrixSummary}`,
        subject: exam.subject,
        grade: exam.grade,
        examType: exam.examType,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        lessons: selectedLessons,
        documents: [],
        strictSourceMode: exam.sourceRef.strictSourceMode,
      });

      const secId = exam.sections[0]?.id || 'sec-matrix';
      const questions = (res.questions || []).map((q, i) => ({
        ...q,
        id: `q-mat-${Date.now()}-${i}`,
        orderIndex: i,
        sectionId: secId,
        subject: exam.subject,
        grade: exam.grade,
      }));

      const sections =
        exam.sections.length > 0
          ? exam.sections
          : [{ id: secId, title: 'NỘI DUNG ĐỀ KIỂM TRA', questionType: questions[0]?.type || 'mcq' }];

      onApplyQuestionsToExam(questions, sections);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể sinh đề từ ma trận.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header & Tabs */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-[24px] sm:text-[26px] font-bold text-[#0F172A]">
            Ma trận & Bảng đặc tả đề kiểm tra — {exam.subject} Lớp {exam.grade}
          </h1>
          <p className="text-base text-[#475569] mt-1">
            Đồng bộ hai chiều giữa Ma trận ↔ Bảng đặc tả ↔ Đề kiểm tra ({exam.questions.length} câu, {examActualPoints}đ).
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('matrix')}
            className={`px-4 py-2 rounded-lg text-[15px] font-semibold cursor-pointer ${
              tab === 'matrix' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Ma trận đề
          </button>
          <button
            type="button"
            onClick={() => setTab('specification')}
            className={`px-4 py-2 rounded-lg text-[15px] font-semibold cursor-pointer ${
              tab === 'specification' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            Bảng đặc tả
          </button>
        </div>
      </div>

      {aiLoading && (
        <div className="no-print rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-5 py-3.5 space-y-2">
          <div className="text-[15px] font-semibold text-[#1E40AF]">
            Trợ lý AI đang tổng hợp ma trận và chuẩn bị câu hỏi bám sát nguồn SGK...
          </div>
          <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-indeterminate" />
          </div>
        </div>
      )}

      {/* Sync Alert */}
      {syncMismatch ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-[15px] text-amber-950">
          <span className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706]" />
            <span>
              Chưa khớp giữa Ma trận ({totals.totalQ} câu · {totals.pts}đ) và Đề kiểm tra thực tế ({exam.questions.length} câu · {examActualPoints}đ).
            </span>
          </span>
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleCreateExamFromMatrix}
            className="rounded-xl bg-[#D97706] px-4 py-2 min-h-[42px] text-[15px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
          >
            {aiLoading ? 'Đang tạo đề...' : 'Tạo đề khớp ma trận'}
          </button>
        </div>
      ) : (
        matrix.rows.length > 0 && (
          <div className="no-print flex items-center gap-2.5 rounded-2xl border border-[#16A34A]/30 bg-emerald-50 px-5 py-3.5 text-[15px] text-emerald-900 font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            <span>Ma trận khớp hoàn toàn với số câu và tổng điểm của đề kiểm tra hiện tại.</span>
          </div>
        )
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-base text-rose-900">
          {errorMsg}
        </div>
      )}

      {tab === 'matrix' ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#2563EB]" />
                Thêm dòng
              </button>
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleAiGenerateMatrix}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'Đang lập ma trận...' : 'Tạo ma trận bằng AI'}
              </button>
              <button
                type="button"
                onClick={generateSpecFromMatrix}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-4 py-2 min-h-[42px] text-[15px] font-semibold text-[#1E40AF] hover:bg-[#DBEAFE] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Đồng bộ sang Bảng đặc tả
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportMatrixToWord(matrix)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#2563EB]" />
                Word
              </button>
              <button
                type="button"
                onClick={() => exportMatrixToExcel(matrix)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#16A34A]" />
                Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#475569]" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-[#CBD5E1] text-[14px] sm:text-[15px]">
              <thead>
                <tr className="bg-slate-100 text-[#0F172A]">
                  <th className="border border-[#CBD5E1] px-2.5 py-3">TT</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Chương/Chủ đề</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Đơn vị kiến thức</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Dạng câu</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">NB</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">TH</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">VD</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">VDC</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">Điểm</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">Tỉ lệ %</th>
                  <th className="no-print border border-[#CBD5E1] px-2.5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="border border-[#CBD5E1] px-2.5 py-2 text-center tabular-nums">
                      {r.stt}
                    </td>
                    <td className="border border-[#CBD5E1] p-1.5">
                      <input
                        type="text"
                        value={r.chapterTitle}
                        onChange={(e) => updateRow(r.id, { chapterTitle: e.target.value })}
                        className="w-full px-2 py-1.5 text-[15px] bg-transparent focus:bg-white focus:outline-none rounded"
                      />
                    </td>
                    <td className="border border-[#CBD5E1] p-1.5">
                      <input
                        type="text"
                        value={r.knowledgeUnit}
                        onChange={(e) => updateRow(r.id, { knowledgeUnit: e.target.value })}
                        className="w-full px-2 py-1.5 text-[15px] bg-transparent focus:bg-white focus:outline-none rounded"
                      />
                    </td>
                    <td className="border border-[#CBD5E1] p-1.5">
                      <select
                        value={r.questionType}
                        onChange={(e) =>
                          updateRow(r.id, { questionType: e.target.value as QuestionType })
                        }
                        className="w-full bg-transparent px-2 py-1.5 text-[15px]"
                      >
                        {Object.entries(QUESTION_TYPE_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(['nbCount', 'thCount', 'vdCount', 'vdcCount'] as const).map((field) => (
                      <td key={field} className="border border-[#CBD5E1] p-1.5 w-16">
                        <input
                          type="number"
                          min={0}
                          value={r[field]}
                          onChange={(e) =>
                            updateRow(r.id, { [field]: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full text-center tabular-nums bg-transparent py-1.5 text-[15px]"
                        />
                      </td>
                    ))}
                    <td className="border border-[#CBD5E1] p-1.5 w-20">
                      <input
                        type="number"
                        step={0.25}
                        min={0}
                        value={r.points}
                        onChange={(e) => {
                          const pts = Math.max(0, Number(e.target.value) || 0);
                          const pct =
                            matrix.totalPoints > 0
                              ? Math.round((pts / matrix.totalPoints) * 1000) / 10
                              : 0;
                          updateRow(r.id, { points: pts, percentage: pct });
                        }}
                        className="w-full text-center tabular-nums bg-transparent py-1.5 text-[15px]"
                      />
                    </td>
                    <td className="border border-[#CBD5E1] p-2 w-20 text-center tabular-nums">
                      {r.percentage}%
                    </td>
                    <td className="no-print border border-[#CBD5E1] px-2.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(r.id)}
                        className="text-[#DC2626] hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-[#0F172A] tabular-nums">
                  <td colSpan={4} className="border border-[#CBD5E1] px-3 py-3 text-right">
                    Tổng cộng ({totals.totalQ} câu)
                  </td>
                  <td className="border border-[#CBD5E1] px-2.5 py-3 text-center">{totals.nb}</td>
                  <td className="border border-[#CBD5E1] px-2.5 py-3 text-center">{totals.th}</td>
                  <td className="border border-[#CBD5E1] px-2.5 py-3 text-center">{totals.vd}</td>
                  <td className="border border-[#CBD5E1] px-2.5 py-3 text-center">{totals.vdc}</td>
                  <td className="border border-[#CBD5E1] px-2.5 py-3 text-center">{totals.pts}</td>
                  <td
                    className={`border border-[#CBD5E1] px-2.5 py-3 text-center ${
                      Math.abs(totals.pct - 100) < 0.5 ? 'text-[#16A34A]' : 'text-[#D97706]'
                    }`}
                  >
                    {totals.pct}%
                  </td>
                  <td className="no-print border border-[#CBD5E1]"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={generateSpecFromMatrix}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Cập nhật từ Ma trận & SGK
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportSpecToWord(spec)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#2563EB]" />
                Word
              </button>
              <button
                type="button"
                onClick={() => exportSpecToExcel(spec)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#16A34A]" />
                Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 min-h-[42px] text-[15px] font-medium hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#475569]" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-[#CBD5E1] text-[14px] sm:text-[15px]">
              <thead>
                <tr className="bg-slate-100 text-[#0F172A]">
                  <th className="border border-[#CBD5E1] px-2.5 py-3">TT</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Chương/Chủ đề</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Đơn vị kiến thức</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Yêu cầu cần đạt</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Mức độ</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-left">Dạng câu</th>
                  <th className="border border-[#CBD5E1] px-2.5 py-3 text-center">Số câu</th>
                  <th className="border border-[#CBD5E1] px-3 py-3 text-center">Mã câu</th>
                </tr>
              </thead>
              <tbody>
                {spec.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-[#CBD5E1] p-8 text-center text-base text-[#475569]">
                      Chưa có dòng đặc tả nào. Bấm <strong>Cập nhật từ Ma trận & SGK</strong> để tự động sinh bảng đặc tả.
                    </td>
                  </tr>
                ) : (
                  spec.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="border border-[#CBD5E1] px-2.5 py-2.5 text-center tabular-nums">
                        {r.stt}
                      </td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5">{r.chapterTitle}</td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5">{r.knowledgeUnit}</td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5 leading-relaxed">{r.learningOutcome}</td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5">
                        {COGNITIVE_LEVEL_LABELS[r.cognitiveLevel]}
                      </td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5">
                        {QUESTION_TYPE_LABELS[r.questionType]}
                      </td>
                      <td className="border border-[#CBD5E1] px-2.5 py-2.5 text-center tabular-nums">
                        {r.questionCount}
                      </td>
                      <td className="border border-[#CBD5E1] px-3 py-2.5 text-center font-semibold">
                        {r.questionNumbers}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
