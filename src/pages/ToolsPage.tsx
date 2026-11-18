import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileInput,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  ExamDocument,
  ExamMatrix,
  ExamQuestion,
  ExamSpecification,
  TextbookLesson,
} from '../types';
import { parseUploadedDocument } from '../services/documentParser';
import {
  normalizeQuestionList,
  parsePlainTextToQuestions,
  splitExamAndAnswers,
} from '../services/textNormalizer';
import { runExamQualityAudit } from '../services/qualityAudit';
import { apiGenerateExam } from '../services/aiClient';

interface ToolsPageProps {
  activeExam: ExamDocument;
  lessons: TextbookLesson[];
  matrix?: ExamMatrix;
  spec?: ExamSpecification;
  onUpdateExam: (updater: (prev: ExamDocument) => ExamDocument) => void;
  onNavigateEditor: () => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({
  activeExam,
  lessons,
  matrix,
  spec,
  onUpdateExam,
  onNavigateEditor,
}) => {
  const [rawText, setRawText] = useState('');
  const [splitResult, setSplitResult] = useState<{ examPart: string; answerPart: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const auditChecks = useMemo(
    () => runExamQualityAudit(activeExam, lessons, matrix, spec),
    [activeExam, lessons, matrix, spec]
  );

  const handleNormalizeActiveExam = () => {
    if (activeExam.questions.length === 0) {
      setStatusMessage('Đề đang soạn chưa có câu hỏi nào để chuẩn hóa.');
      return;
    }
    const normalized = normalizeQuestionList(activeExam.questions);
    onUpdateExam((prev) => ({
      ...prev,
      questions: normalized,
      updatedAt: new Date().toISOString(),
    }));
    setStatusMessage(
      `Đã chuẩn hóa khoảng trắng, dấu câu, đánh lại số thứ tự (1–${normalized.length}) và phương án A, B, C, D.`
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseUploadedDocument(file, 'sample_exam', activeExam.subject, activeExam.grade);
      setRawText(parsed.extractedText || '');
      setStatusMessage(
        parsed.warningNote || `Đã trích xuất nội dung từ "${file.name}". Bấm "Chuyển vào trình soạn thảo" để tách câu hỏi.`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Lỗi đọc tệp.');
    } finally {
      e.target.value = '';
    }
  };

  const handleParseToEditor = () => {
    const { examPart } = splitExamAndAnswers(rawText);
    const secId = activeExam.sections[0]?.id || 'sec-imported';
    const parsedQuestions = parsePlainTextToQuestions(examPart, secId);
    if (parsedQuestions.length === 0) {
      setStatusMessage('Không nhận diện được câu hỏi nào (hãy đánh dấu dạng "Câu 1: ...", "Câu 2: ...").');
      return;
    }
    onUpdateExam((prev) => ({
      ...prev,
      sections:
        prev.sections.length > 0
          ? prev.sections
          : [{ id: secId, title: 'NỘI DUNG ĐỀ KIỂM TRA', questionType: 'mcq' }],
      questions: [...prev.questions, ...parsedQuestions].map((q, i) => ({
        ...q,
        orderIndex: i,
      })),
    }));
    onNavigateEditor();
  };

  const handleCreateReviewWorksheet = async (kind: 'worksheet' | 'review') => {
    const selectedLessons = lessons.filter((l) => activeExam.sourceRef.lessonIds.includes(l.id));
    setAiBusy(true);
    setStatusMessage('');
    try {
      const res = await apiGenerateExam({
        prompt:
          kind === 'worksheet'
            ? 'Tạo một Phiếu học tập gồm 5 câu hỏi vận dụng nhanh và thảo luận nhóm bám sát các bài SGK đã chọn.'
            : 'Tạo đề cương bài tập ôn tập gồm 8 câu hỏi phân hóa 3 mức độ bám sát các bài SGK đã chọn.',
        subject: activeExam.subject,
        grade: activeExam.grade,
        examType: kind === 'worksheet' ? 'Phiếu học tập' : 'Đề ôn tập',
        durationMinutes: 30,
        totalPoints: 10,
        lessons: selectedLessons,
        documents: [],
        strictSourceMode: activeExam.sourceRef.strictSourceMode,
      });

      const secId = activeExam.sections[0]?.id || 'sec-tool';
      const qs: ExamQuestion[] = (res.questions || []).map((q, i) => ({
        ...q,
        id: `q-tool-${Date.now()}-${i}`,
        orderIndex: i,
        sectionId: secId,
        subject: activeExam.subject,
        grade: activeExam.grade,
      }));
      onUpdateExam((prev) => ({
        ...prev,
        examType: kind === 'worksheet' ? 'worksheet' : 'review',
        title:
          kind === 'worksheet'
            ? `Phiếu học tập ${prev.subject} ${prev.grade}`
            : `Bài ôn tập ${prev.subject} ${prev.grade}`,
        sections: [{ id: secId, title: kind === 'worksheet' ? 'PHIẾU HỌC TẬP' : 'BÀI ÔN TẬP', questionType: qs[0]?.type || 'mcq' }],
        questions: qs,
      }));
      onNavigateEditor();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Không thể tạo tài liệu từ AI.');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">
          Công cụ hỗ trợ giáo viên & Nhập đề Word/PDF
        </h1>
        <p className="text-base text-[#475569] mt-1">
          Chuẩn hóa văn bản đề, tách đề và đáp án, chuyển tệp Word/PDF thành câu hỏi có cấu trúc và kiểm tra chất lượng đề trước khi xuất.
        </p>
      </div>

      {aiBusy && (
        <div className="rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-5 py-3.5 space-y-2">
          <div className="text-[15px] font-semibold text-[#1E40AF]">
            Trợ lý AI đang tạo tài liệu ôn tập / phiếu học tập từ các bài SGK đã chọn...
          </div>
          <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-indeterminate" />
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="rounded-2xl border border-[#2563EB]/30 bg-[#EFF6FF] px-5 py-3.5 text-base text-[#1E40AF] flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Import & Split */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[19px] font-bold text-[#0F172A]">
              Nhập đề từ Word / PDF / Văn bản & Tách đề - đáp án
            </h2>
            <label className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
              <FileInput className="w-4 h-4 text-[#2563EB]" />
              Chọn tệp DOCX / PDF / TXT
              <input
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Dán nội dung đề kiểm tra hoặc tải tệp DOCX/PDF ở trên...\nVí dụ:\nCâu 1: Trong các câu sau, câu nào là mệnh đề?\nA. Hôm nay trời đẹp quá!\nB. 2 + 3 = 5.\nC. Bạn làm bài tập chưa?\nD. Hãy đứng lên!\nĐáp án: B`}
            className="w-full rounded-xl border border-[#CBD5E1] p-4 text-[15px] font-mono leading-relaxed focus:border-[#2563EB] focus:outline-none"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!rawText.trim()}
              onClick={handleParseToEditor}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 min-h-[44px] text-base font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
            >
              <FileInput className="w-5 h-5" />
              Chuyển vào trình soạn thảo
            </button>
            <button
              type="button"
              disabled={!rawText.trim()}
              onClick={() => setSplitResult(splitExamAndAnswers(rawText))}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 min-h-[44px] text-base font-semibold text-[#0F172A] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <Scissors className="w-5 h-5 text-[#2563EB]" />
              Tách phần đề và phần đáp án
            </button>
          </div>

          {splitResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4">
                <div className="font-bold text-base text-[#0F172A] mb-1.5">Phần Đề</div>
                <pre className="whitespace-pre-wrap max-h-48 overflow-y-auto text-[14px] text-[#334155] leading-relaxed">
                  {splitResult.examPart}
                </pre>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4">
                <div className="font-bold text-base text-[#0F172A] mb-1.5">Phần Đáp án</div>
                <pre className="whitespace-pre-wrap max-h-48 overflow-y-auto text-[14px] text-[#334155] leading-relaxed">
                  {splitResult.answerPart || 'Không tìm thấy mục ĐÁP ÁN riêng.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Normalization & Quality Audit */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
            <h2 className="text-[19px] font-bold text-[#0F172A]">Chuẩn hóa & Học liệu nhanh</h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleNormalizeActiveExam}
                className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 min-h-[48px] text-left hover:bg-slate-50 cursor-pointer"
              >
                <span className="flex items-center gap-3 text-base font-semibold text-[#0F172A]">
                  <Wand2 className="w-5 h-5 text-[#2563EB] shrink-0" />
                  Chuẩn hóa số câu, phương án A/B/C/D & khoảng trắng
                </span>
              </button>

              <button
                type="button"
                disabled={aiBusy}
                onClick={() => handleCreateReviewWorksheet('worksheet')}
                className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 min-h-[48px] text-left hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="flex items-center gap-3 text-base font-semibold text-[#0F172A]">
                  <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0" />
                  {aiBusy ? 'Đang xử lý...' : 'Tạo phiếu học tập từ bài SGK đã chọn'}
                </span>
              </button>

              <button
                type="button"
                disabled={aiBusy}
                onClick={() => handleCreateReviewWorksheet('review')}
                className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 min-h-[48px] text-left hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="flex items-center gap-3 text-base font-semibold text-[#0F172A]">
                  <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0" />
                  {aiBusy ? 'Đang xử lý...' : 'Tạo bài ôn tập từ bài SGK đã chọn'}
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-[19px] font-bold text-[#0F172A]">
                Báo cáo kiểm tra chất lượng đề hiện tại
              </h2>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {auditChecks.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border px-4 py-3 ${
                    c.status === 'pass'
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                      : c.status === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-950'
                        : c.status === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-950'
                          : 'border-[#E2E8F0] bg-[#F5F7FB] text-[#334155]'
                  }`}
                >
                  <div className="text-[15px] font-bold">{c.label}</div>
                  <div className="text-sm opacity-90 mt-0.5">{c.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
