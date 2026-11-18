import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  Download,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CognitiveLevel,
  ExamMatrix,
  ExamQuestion,
  QuestionType,
  TextbookLesson,
} from '../types';
import {
  COGNITIVE_LEVEL_LABELS,
  GRADES,
  QUESTION_TYPE_LABELS,
  getSubjectsForGrade,
} from '../data/curriculum';
import { MathText } from '../components/MathText';
import { useToast } from '../components/ToastProvider';

interface QuestionBankPageProps {
  questions: ExamQuestion[];
  lessons: TextbookLesson[];
  activeMatrix?: ExamMatrix;
  onSaveQuestion: (q: ExamQuestion) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onAddQuestionsToExam: (qs: ExamQuestion[]) => void;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  questions,
  lessons,
  activeMatrix,
  onSaveQuestion,
  onDeleteQuestion,
  onAddQuestionsToExam,
}) => {
  const toast = useToast();
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newGrade, setNewGrade] = useState(10);
  const [newSubject, setNewSubject] = useState('Toán');
  const [newType, setNewType] = useState<QuestionType>('mcq');
  const [newLevel, setNewLevel] = useState<CognitiveLevel>('NB');
  const [newStem, setNewStem] = useState('');
  const [newOpts, setNewOpts] = useState(['', '', '', '']);
  const [newAnswer, setNewAnswer] = useState('A');
  const [newExplanation, setNewExplanation] = useState('');
  const [newLessonId, setNewLessonId] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (gradeFilter !== 'all' && item.grade !== gradeFilter) return false;
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;
      if (levelFilter !== 'all' && item.cognitiveLevel !== levelFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return `${item.stem} ${item.correctAnswer} ${item.explanation}`.toLowerCase().includes(q);
    });
  }, [questions, gradeFilter, subjectFilter, levelFilter, typeFilter, search]);

  const duplicateCount = useMemo(() => {
    const seen = new Map<string, number>();
    for (const q of questions) {
      const k = q.stem.trim().toLowerCase().replace(/\s+/g, ' ');
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    return Array.from(seen.values()).filter((c) => c > 1).length;
  }, [questions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStem.trim()) return;
    const item: ExamQuestion = {
      id: `qb-${Date.now()}`,
      orderIndex: 0,
      sectionId: 'sec-main',
      type: newType,
      cognitiveLevel: newLevel,
      points: 0.5,
      stem: newStem.trim(),
      options: newType === 'mcq' ? newOpts.map((o) => o.trim()) : undefined,
      correctAnswer: newAnswer.trim(),
      explanation: newExplanation.trim(),
      sourceLessonId: newLessonId || undefined,
      grade: newGrade,
      subject: newSubject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveQuestion(item);
    setNewStem('');
    setNewOpts(['', '', '', '']);
    setNewExplanation('');
    setShowAdd(false);
  };

  const handleExportExcel = () => {
    const rows = filtered.map((q, idx) => ({
      STT: idx + 1,
      Môn: q.subject || '',
      Lớp: q.grade || '',
      Dạng: QUESTION_TYPE_LABELS[q.type],
      'Mức độ': COGNITIVE_LEVEL_LABELS[q.cognitiveLevel],
      'Nội dung': q.stem,
      A: q.options?.[0] || '',
      B: q.options?.[1] || '',
      C: q.options?.[2] || '',
      D: q.options?.[3] || '',
      'Đáp án': q.correctAnswer,
      'Lời giải': q.explanation,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NganHangCauHoi');
    XLSX.writeFile(wb, `Ngan_hang_cau_hoi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất ngân hàng câu hỏi ra Excel.');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      let imported = 0;
      for (const r of rows) {
        const stem = String(r['Nội dung'] || r['stem'] || '').trim();
        if (!stem) continue;
        const optA = String(r['A'] || '').trim();
        const optB = String(r['B'] || '').trim();
        const optC = String(r['C'] || '').trim();
        const optD = String(r['D'] || '').trim();
        const hasOpts = Boolean(optA && optB && optC && optD);
        await onSaveQuestion({
          id: `qb-imp-${Date.now()}-${imported}`,
          orderIndex: 0,
          sectionId: 'sec-main',
          type: hasOpts ? 'mcq' : 'essay',
          cognitiveLevel: 'NB',
          points: 0.5,
          stem,
          options: hasOpts ? [optA, optB, optC, optD] : undefined,
          correctAnswer: String(r['Đáp án'] || r['correctAnswer'] || 'A'),
          explanation: String(r['Lời giải'] || r['explanation'] || ''),
          subject: String(r['Môn'] || 'Toán'),
          grade: Number(r['Lớp'] || 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        imported++;
      }
      toast.success(`Đã nhập ${imported} câu hỏi từ Excel vào ngân hàng.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đọc tệp Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePickByMatrix = () => {
    if (!activeMatrix || activeMatrix.rows.length === 0) {
      toast.warning('Chưa có ma trận đề để chọn câu hỏi ngẫu nhiên.');
      return;
    }
    const picked: ExamQuestion[] = [];
    const usedIds = new Set<string>();
    for (const row of activeMatrix.rows) {
      const quotas: [CognitiveLevel, number][] = [
        ['NB', row.nbCount],
        ['TH', row.thCount],
        ['VD', row.vdCount],
        ['VDC', row.vdcCount],
      ];
      for (const [lv, count] of quotas) {
        if (count <= 0) continue;
        const pool = questions.filter(
          (q) =>
            !usedIds.has(q.id) &&
            q.type === row.questionType &&
            q.cognitiveLevel === lv &&
            (!row.lessonId || q.sourceLessonId === row.lessonId)
        );
        for (const chosen of pool.slice(0, count)) {
          usedIds.add(chosen.id);
          picked.push(chosen);
        }
      }
    }
    if (picked.length === 0) {
      toast.warning('Không tìm thấy câu hỏi phù hợp trong ngân hàng khớp với ma trận.');
      return;
    }
    onAddQuestionsToExam(picked);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">
            Ngân hàng câu hỏi ({questions.length} câu)
          </h1>
          <p className="text-base text-[#475569] mt-1">
            Lưu trữ, lọc theo bài học SGK, phát hiện trùng lặp và chèn nhanh vào đề kiểm tra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 min-h-[44px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
          <button
            type="button"
            onClick={handlePickByMatrix}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-4 py-2 min-h-[44px] text-[15px] font-semibold text-[#1E40AF] hover:bg-[#DBEAFE] cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            Chọn ngẫu nhiên theo ma trận
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[44px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer">
            <Upload className="w-4 h-4 text-[#2563EB]" />
            Nhập Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[44px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#16A34A]" />
            Xuất Excel
          </button>
        </div>
      </div>

      {duplicateCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-[15px] text-amber-950">
          <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />
          <span>Phát hiện {duplicateCount} nhóm câu hỏi có nội dung trùng lặp trong ngân hàng.</span>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs"
        >
          <div className="font-bold text-[19px] text-[#0F172A]">
            Thêm câu hỏi mới vào ngân hàng
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <select
              value={newGrade}
              onChange={(e) => setNewGrade(Number(e.target.value))}
              className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Lớp {g}
                </option>
              ))}
            </select>
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
            >
              {getSubjectsForGrade(newGrade).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as QuestionType)}
              className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as CognitiveLevel)}
              className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
            >
              {Object.entries(COGNITIVE_LEVEL_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
            <select
              value={newLessonId}
              onChange={(e) => setNewLessonId(e.target.value)}
              className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
            >
              <option value="">-- Gắn bài SGK (tùy chọn) --</option>
              {lessons
                .filter((l) => l.grade === newGrade && l.subject === newSubject)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lessonNumber}: {l.lessonTitle}
                  </option>
                ))}
            </select>
          </div>
          <textarea
            required
            rows={3}
            value={newStem}
            onChange={(e) => setNewStem(e.target.value)}
            placeholder="Nội dung câu hỏi (bọc công thức trong $...$)..."
            className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base"
          />
          {newType === 'mcq' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                <input
                  key={lbl}
                  type="text"
                  value={newOpts[idx]}
                  onChange={(e) => {
                    const next = [...newOpts];
                    next[idx] = e.target.value;
                    setNewOpts(next);
                  }}
                  placeholder={`Phương án ${lbl}`}
                  className="rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-base"
                />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Đáp án đúng"
              className="rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-base"
            />
            <input
              type="text"
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              placeholder="Lời giải chi tiết"
              className="rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-base"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-[15px] font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#2563EB] px-5 py-2 text-[15px] text-white font-semibold hover:bg-[#1E40AF]"
            >
              Lưu vào ngân hàng
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nội dung câu hỏi..."
            className="w-full rounded-xl border border-[#CBD5E1] pl-10 pr-3 py-2 text-base"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
        >
          <option value="all">Tất cả khối lớp</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
        >
          <option value="all">Tất cả môn học</option>
          {getSubjectsForGrade(12).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
        >
          <option value="all">Tất cả mức độ</option>
          {Object.entries(COGNITIVE_LEVEL_LABELS).map(([k, lbl]) => (
            <option key={k} value={k}>
              {lbl}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-base"
        >
          <option value="all">Tất cả dạng câu</option>
          {Object.entries(QUESTION_TYPE_LABELS).map(([k, lbl]) => (
            <option key={k} value={k}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      {/* Question List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center text-base text-[#475569]">
          Chưa có câu hỏi nào khớp bộ lọc. Bạn có thể thêm câu hỏi mới, nhập từ Excel hoặc lưu trực tiếp câu hỏi từ trình soạn đề.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((q) => (
            <div key={q.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-2.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#475569]">
                <span className="font-medium">
                  {q.subject || 'Chưa phân môn'} · Lớp {q.grade || '-'} · {QUESTION_TYPE_LABELS[q.type]} ·{' '}
                  {COGNITIVE_LEVEL_LABELS[q.cognitiveLevel]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAddQuestionsToExam([q])}
                    className="rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-3.5 py-1.5 text-[15px] text-[#1E40AF] font-semibold hover:bg-[#DBEAFE] cursor-pointer"
                  >
                    + Đưa vào đề đang soạn
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(q.id)}
                    className="p-2 text-[#DC2626] hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="text-base text-[#0F172A] leading-relaxed">
                <MathText text={q.stem} />
              </div>
              {q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[15px] text-[#334155] pl-4">
                  {['A', 'B', 'C', 'D'].map((lbl, i) => (
                    <div key={lbl}>
                      <strong>{lbl}. </strong>
                      <MathText text={q.options?.[i] || ''} />
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[15px] text-[#16A34A] font-medium">
                <strong>Đáp án: </strong>
                <MathText text={q.correctAnswer} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
