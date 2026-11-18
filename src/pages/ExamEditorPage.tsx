import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FunctionSquare,
  HelpCircle,
  Lock,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Presentation,
  Printer,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Shapes,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
  X,
} from 'lucide-react';
import {
  AiChatMessage,
  CognitiveLevel,
  ExamDocument,
  ExamMatrix,
  ExamQuestion,
  ExamSpecification,
  ExamType,
  QuestionDiagram,
  QuestionType,
  TextbookLesson,
  UserDocument,
} from '../types';
import {
  COGNITIVE_LEVEL_LABELS,
  DEFAULT_EXAM_DURATION,
  EXAM_TYPE_LABELS,
  GRADES,
  QUESTION_TYPE_LABELS,
  getSubjectsForGrade,
} from '../data/curriculum';
import { EXAM_TEMPLATES } from '../data/examTemplates';
import { MathText } from '../components/MathText';
import { FormulaBuilder } from '../components/FormulaBuilder';
import { ScientificDiagramBuilder } from '../components/ScientificDiagramBuilder';
import { apiChatAssistant, apiEditQuestion, apiGenerateExam } from '../services/aiClient';
import { exportExamToWord, WordExportMode } from '../services/wordExport';
import { runExamQualityAudit } from '../services/qualityAudit';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from '../components/ToastProvider';

interface ExamEditorPageProps {
  exam: ExamDocument;
  lessons: TextbookLesson[];
  documents: UserDocument[];
  matrix?: ExamMatrix;
  spec?: ExamSpecification;
  saveStatus: string;
  onUpdateExam: (updater: (prev: ExamDocument) => ExamDocument) => void;
  onSaveNow: () => Promise<void>;
  onNewExam: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSourceSelector: () => void;
  onOpenPresentation: () => void;
  onSaveQuestionToBank: (q: ExamQuestion) => Promise<void>;
  onNavigateTab: (tab: 'matrix' | 'specification' | 'shuffler' | 'omr') => void;
}

export const ExamEditorPage: React.FC<ExamEditorPageProps> = ({
  exam,
  lessons,
  documents,
  matrix,
  spec,
  saveStatus,
  onUpdateExam,
  onSaveNow,
  onNewExam,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSourceSelector,
  onOpenPresentation,
  onSaveQuestionToBank,
  onNavigateTab,
}) => {
  const isOnline = useOnlineStatus();
  const toast = useToast();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<'ai' | 'formula' | 'diagram'>('ai');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    exam.questions[0]?.id || null
  );
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showAnswersInPaper, setShowAnswersInPaper] = useState(false);
  const [showSolutionsInPaper, setShowSolutionsInPaper] = useState(false);
  const [showHeaderConfig, setShowHeaderConfig] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [formulaInitialLatex, setFormulaInitialLatex] = useState('\\frac{-b \\pm \\sqrt{\\Delta}}{2a}');

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStage, setAiStage] = useState('Đang đối chiếu nguồn SGK và cấu trúc...');
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [lastAiSnapshot, setLastAiSnapshot] = useState<ExamDocument | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!aiBusy) {
      setAiStage('Đang đối chiếu nguồn SGK và cấu trúc...');
      return;
    }
    const timer = window.setTimeout(() => {
      setAiStage('Đang tổng hợp nội dung và kiểm tra câu hỏi...');
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [aiBusy]);

  const selectedLessons = useMemo(
    () => lessons.filter((l) => exam.sourceRef.lessonIds.includes(l.id)),
    [lessons, exam.sourceRef.lessonIds]
  );
  const selectedDocs = useMemo(
    () => documents.filter((d) => exam.sourceRef.documentIds.includes(d.id)),
    [documents, exam.sourceRef.documentIds]
  );

  const availableSubjects = useMemo(() => getSubjectsForGrade(exam.grade), [exam.grade]);
  const sortedQuestions = useMemo(
    () => exam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [exam.questions]
  );

  const totalScore = useMemo(
    () => Math.round(exam.questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) * 100) / 100,
    [exam.questions]
  );

  const auditResults = useMemo(
    () => (showAuditDrawer ? runExamQualityAudit(exam, lessons, matrix, spec) : []),
    [showAuditDrawer, exam, lessons, matrix, spec]
  );

  const applyTemplate = (templateId: string) => {
    const tpl = EXAM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    onUpdateExam((prev) => ({
      ...prev,
      examType: tpl.examType,
      durationMinutes: tpl.durationMinutes,
      totalPoints: tpl.totalPoints,
      header: {
        ...prev.header,
        examTitle: tpl.name.toUpperCase(),
        durationLabel: `${tpl.durationMinutes} phút`,
      },
      sections: tpl.sections.map((s, idx) => ({
        id: `sec-${Date.now()}-${idx}`,
        title: s.title,
        description: s.description,
        questionType: s.questionType,
        pointsPerQuestion: s.pointsPerQuestion,
      })),
    }));
  };

  const addManualQuestion = (type: QuestionType) => {
    const targetSection =
      exam.sections.find((s) => s.questionType === type) || exam.sections[0];
    const sectionId = targetSection ? targetSection.id : 'sec-default';
    const newQ: ExamQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderIndex: exam.questions.length,
      sectionId,
      type,
      cognitiveLevel: 'NB',
      points: targetSection?.pointsPerQuestion || 0.5,
      stem:
        type === 'mcq'
          ? 'Nhập nội dung câu hỏi trắc nghiệm mới...'
          : type === 'true_false'
            ? 'Cho các khẳng định sau. Xác định tính đúng/sai của mỗi ý:'
            : 'Nhập nội dung câu hỏi...',
      options:
        type === 'mcq'
          ? ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D']
          : undefined,
      trueFalseItems:
        type === 'true_false'
          ? [
              { label: 'a', statement: 'Phát biểu ý a', isTrue: true },
              { label: 'b', statement: 'Phát biểu ý b', isTrue: false },
              { label: 'c', statement: 'Phát biểu ý c', isTrue: true },
              { label: 'd', statement: 'Phát biểu ý d', isTrue: false },
            ]
          : undefined,
      correctAnswer: type === 'mcq' ? 'A' : type === 'true_false' ? 'a-Đ; b-S; c-Đ; d-S' : '',
      explanation: '',
      subject: exam.subject,
      grade: exam.grade,
    };

    onUpdateExam((prev) => ({
      ...prev,
      sections:
        prev.sections.length > 0
          ? prev.sections
          : [
              {
                id: 'sec-default',
                title: 'NỘI DUNG ĐỀ KIỂM TRA',
                questionType: type,
              },
            ],
      questions: [...prev.questions, newQ],
    }));
    setSelectedQuestionId(newQ.id);
    setEditingQuestionId(newQ.id);
  };

  const updateQuestion = (qId: string, patch: Partial<ExamQuestion>) => {
    onUpdateExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
    }));
  };

  const deleteQuestion = (qId: string) => {
    onUpdateExam((prev) => {
      const remaining = prev.questions
        .filter((q) => q.id !== qId)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((q, idx) => ({ ...q, orderIndex: idx }));
      return { ...prev, questions: remaining };
    });
    if (selectedQuestionId === qId) setSelectedQuestionId(null);
    if (editingQuestionId === qId) setEditingQuestionId(null);
  };

  const moveQuestion = (qId: string, dir: -1 | 1) => {
    onUpdateExam((prev) => {
      const sorted = prev.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = sorted.findIndex((q) => q.id === qId);
      const targetIdx = idx + dir;
      if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return prev;
      [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];
      return {
        ...prev,
        questions: sorted.map((q, i) => ({ ...q, orderIndex: i })),
      };
    });
  };

  const duplicateQuestion = (q: ExamQuestion) => {
    const copy: ExamQuestion = {
      ...structuredClone(q),
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderIndex: exam.questions.length,
    };
    onUpdateExam((prev) => ({ ...prev, questions: [...prev.questions, copy] }));
    setSelectedQuestionId(copy.id);
  };

  const insertFormulaIntoSelected = (wrappedLatex: string) => {
    const targetId = selectedQuestionId || sortedQuestions[0]?.id;
    if (!targetId) {
      toast.warning('Vui lòng thêm ít nhất 1 câu hỏi trước khi chèn công thức.');
      return;
    }
    const q = exam.questions.find((x) => x.id === targetId);
    if (!q) return;
    updateQuestion(targetId, { stem: `${q.stem} ${wrappedLatex}`.trim() });
    setEditingQuestionId(targetId);
    toast.success('Đã chèn công thức vào câu hỏi.');
  };

  const insertDiagramIntoSelected = (diagram: QuestionDiagram) => {
    const targetId = selectedQuestionId || sortedQuestions[0]?.id;
    if (!targetId) {
      toast.warning('Vui lòng thêm ít nhất 1 câu hỏi trước khi chèn hình vẽ.');
      return;
    }
    updateQuestion(targetId, { diagram });
    toast.success('Đã chèn hình vẽ khoa học vào câu hỏi.');
  };

  const insertAiQuestionsToExam = (newQuestions: ExamQuestion[], replaceExisting: boolean) => {
    setLastAiSnapshot(structuredClone(exam));
    onUpdateExam((prev) => {
      const baseList = replaceExisting ? [] : prev.questions;
      const ensuredSections =
        prev.sections.length > 0
          ? prev.sections
          : [
              {
                id: 'sec-main',
                title: 'NỘI DUNG ĐỀ KIỂM TRA',
                questionType: newQuestions[0]?.type || 'mcq',
              },
            ];

      const mapped = newQuestions.map((nq, idx) => {
        const matchingSec =
          ensuredSections.find((s) => s.questionType === nq.type) || ensuredSections[0];
        return {
          ...nq,
          orderIndex: baseList.length + idx,
          sectionId: matchingSec.id,
        };
      });

      return {
        ...prev,
        sections: ensuredSections,
        questions: [...baseList, ...mapped],
      };
    });
  };

  const handleAiSend = async (customPrompt?: string) => {
    const text = (customPrompt ?? aiPrompt).trim();
    if (!text || aiBusy) return;

    if (!isOnline) {
      setLastFailedPrompt(text);
      setAiMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content:
            'Thiết bị đang mất kết nối Internet. Chức năng trợ lý AI trực tuyến tạm thời không khả dụng. Dữ liệu đề kiểm tra cục bộ vẫn được lưu an toàn.',
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
      toast.warning('Đang mất kết nối Internet. Chức năng AI tạm thời không khả dụng.');
      return;
    }

    setLastFailedPrompt(null);
    const userMsg: AiChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setAiPrompt('');
    setAiBusy(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isGenerationIntent =
        /tạo đề|soạn đề|sinh câu|thêm \d+ câu|tạo \d+ câu|đề kiểm tra|bài tập/i.test(text);
      const isSingleQuestionEdit =
        /sửa câu|thay số liệu câu|tăng mức độ câu|tạo câu tương đương/i.test(text);

      if (isSingleQuestionEdit) {
        const numMatch = text.match(/câu\s+(\d+)/i);
        const qIdx = numMatch ? Number(numMatch[1]) - 1 : -1;
        const targetQ =
          qIdx >= 0 && sortedQuestions[qIdx]
            ? sortedQuestions[qIdx]
            : sortedQuestions.find((q) => q.id === selectedQuestionId);

        if (!targetQ) {
          throw new Error('Không xác định được câu hỏi cần sửa. Vui lòng chọn câu hỏi hoặc nêu rõ số câu (VD: "Sửa câu 2...").');
        }

        const res = await apiEditQuestion(
          targetQ,
          text,
          selectedLessons,
          selectedDocs,
          controller.signal
        );
        setLastAiSnapshot(structuredClone(exam));
        updateQuestion(targetQ.id, {
          ...res.question,
          id: targetQ.id,
          orderIndex: targetQ.orderIndex,
          sectionId: targetQ.sectionId,
        });
        setAiMessages((prev) => [
          ...prev,
          {
            id: `msg-a-${Date.now()}`,
            role: 'assistant',
            content: `Đã cập nhật Câu ${targetQ.orderIndex + 1}: ${res.note}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (isGenerationIntent) {
        const res = await apiGenerateExam(
          {
            prompt: text,
            subject: exam.subject,
            grade: exam.grade,
            examType: EXAM_TYPE_LABELS[exam.examType],
            durationMinutes: exam.durationMinutes,
            totalPoints: exam.totalPoints,
            sections: exam.sections.map((s) => ({
              title: s.title,
              questionType: s.questionType,
              pointsPerQuestion: s.pointsPerQuestion,
            })),
            lessons: selectedLessons,
            documents: selectedDocs,
            strictSourceMode: exam.sourceRef.strictSourceMode,
          },
          controller.signal
        );

        const generated: ExamQuestion[] = (res.questions || []).map((q, idx) => ({
          ...q,
          id: `q-ai-${Date.now()}-${idx}`,
          orderIndex: idx,
          sectionId: exam.sections[0]?.id || 'sec-main',
          subject: exam.subject,
          grade: exam.grade,
        }));

        const warningBlock =
          res.warnings && res.warnings.length > 0
            ? `\n\nLưu ý kiểm tra:\n- ${res.warnings.join('\n- ')}`
            : '';

        // Auto-insert if exam is currently empty; otherwise attach button so teacher controls merge/replace
        if (exam.questions.length === 0 && generated.length > 0) {
          insertAiQuestionsToExam(generated, true);
        }

        setAiMessages((prev) => [
          ...prev,
          {
            id: `msg-a-${Date.now()}`,
            role: 'assistant',
            content: `${res.summary} (Đã tạo ${generated.length} câu hỏi).${warningBlock}`,
            timestamp: new Date().toISOString(),
            generatedQuestions: generated,
            sourceLessonsUsed: selectedLessons.map((l) => `${l.lessonNumber}: ${l.lessonTitle}`),
          },
        ]);
      } else {
        const res = await apiChatAssistant(
          {
            message: text,
            examSummary: {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              durationMinutes: exam.durationMinutes,
              totalPoints: exam.totalPoints,
              actualPoints: totalScore,
              questions: sortedQuestions.map((q, i) => ({
                number: i + 1,
                type: q.type,
                points: q.points,
                stem: q.stem,
                options: q.options,
                correctAnswer: q.correctAnswer,
              })),
            },
            lessons: selectedLessons,
            documents: selectedDocs,
          },
          controller.signal
        );
        setAiMessages((prev) => [
          ...prev,
          {
            id: `msg-a-${Date.now()}`,
            role: 'assistant',
            content: res.reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `msg-a-${Date.now()}`,
            role: 'assistant',
            content: 'Đã hủy yêu cầu tạo đề theo thao tác của giáo viên.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setLastFailedPrompt(text);
        setAiMessages((prev) => [
          ...prev,
          {
            id: `msg-a-${Date.now()}`,
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Không thể hoàn tất yêu cầu AI.',
            timestamp: new Date().toISOString(),
            error: true,
          },
        ]);
      }
    } finally {
      setAiBusy(false);
      abortControllerRef.current = null;
    }
  };

  const handleAiEditSingleQuestion = async (q: ExamQuestion, instruction: string) => {
    if (!isOnline) {
      toast.warning('Thiết bị đang ngoại tuyến, không thể gọi trợ lý AI.');
      return;
    }
    if (aiBusy) return;
    setRightOpen(true);
    setRightTab('ai');
    setAiBusy(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await apiEditQuestion(q, instruction, selectedLessons, selectedDocs, controller.signal);
      setLastAiSnapshot(structuredClone(exam));
      updateQuestion(q.id, {
        ...res.question,
        id: q.id,
        orderIndex: q.orderIndex,
        sectionId: q.sectionId,
      });
      setAiMessages((prev) => [
        ...prev,
        {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          content: `Đã xử lý Câu ${q.orderIndex + 1} (${instruction}): ${res.note}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      toast.success(`Đã cập nhật Câu ${q.orderIndex + 1} bằng AI.`);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Lỗi chỉnh sửa câu hỏi bằng AI.',
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  const handleExportWord = async (mode: WordExportMode) => {
    setExportMenuOpen(false);
    setExportBusy(true);
    try {
      await exportExamToWord(exam, mode, matrix, spec);
      toast.success('Đã xuất tệp Word (.docx) thành công.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xuất tệp Word.');
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-40 bg-[#F5F7FB]' : 'h-[calc(100vh-64px)]'
      }`}
    >
      {/* Top Editor Action Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-transparent p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Thu gọn/mở rộng cột trái"
          >
            {leftOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onNewExam}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[14px] font-medium text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            Đề mới
          </button>

          <button
            type="button"
            onClick={onSaveNow}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#1E40AF] transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            Lưu đề
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-35 transition-colors"
            title="Hoàn tác"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-35 transition-colors"
            title="Làm lại"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <span className="h-5 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onOpenSourceSelector}
            className="min-h-[40px] inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-[#DBEAFE]/70 px-3.5 py-2 text-[14px] font-semibold text-[#1E40AF] hover:bg-[#DBEAFE] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Nguồn SGK ({selectedLessons.length + selectedDocs.length})
          </button>

          <button
            type="button"
            onClick={() => setShowHeaderConfig((v) => !v)}
            className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-[14px] font-medium transition-colors ${
              showHeaderConfig
                ? 'border-blue-500 bg-blue-50 text-[#1E40AF]'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Đầu đề & Khổ giấy
          </button>

          <button
            type="button"
            onClick={() => setShowAuditDrawer((v) => !v)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[14px] font-medium transition-colors ${
              showAuditDrawer
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Kiểm tra chất lượng
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-slate-500 mr-1 tabular-nums">{saveStatus}</span>

          <button
            type="button"
            onClick={() => setShowAnswersInPaper((v) => !v)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[14px] font-medium transition-colors ${
              showAnswersInPaper
                ? 'border-blue-600 bg-blue-50 text-[#1E40AF]'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {showAnswersInPaper ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Đáp án
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Xem trước khi in hoặc Lưu dưới dạng PDF chuẩn A4"
          >
            <Printer className="w-4 h-4" />
            In / PDF
          </button>

          <div className="relative">
            <button
              type="button"
              disabled={exportBusy}
              onClick={() => setExportMenuOpen((v) => !v)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-[14px] font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              {exportBusy ? 'Đang tạo Word...' : 'Xuất Word'}
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-[#E2E8F0] bg-white py-1.5 shadow-xl z-30 text-[14px]">
                <button
                  type="button"
                  onClick={() => handleExportWord('exam_only')}
                  className="w-full px-4 py-2.5 text-left text-slate-800 hover:bg-slate-50"
                >
                  Chỉ đề kiểm tra (.docx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord('exam_with_answers')}
                  className="w-full px-4 py-2.5 text-left text-slate-800 hover:bg-slate-50"
                >
                  Đề và bảng đáp án (.docx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord('exam_with_solutions')}
                  className="w-full px-4 py-2.5 text-left text-slate-800 hover:bg-slate-50"
                >
                  Đề và hướng dẫn giải chi tiết (.docx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord('full_dossier')}
                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 border-t border-slate-100 font-semibold text-[#1E40AF]"
                >
                  Toàn bộ hồ sơ (Đề + Đáp án + Ma trận + Đặc tả)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenPresentation}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Chế độ trình chiếu lên tivi/máy chiếu"
          >
            <Presentation className="w-4 h-4" />
            Trình chiếu
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Chế độ toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setRightOpen((v) => !v)}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Thu gọn/mở rộng trợ lý & công cụ"
          >
            {rightOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Optional Header Config Bar */}
      {showHeaderConfig && (
        <div className="no-print border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[14px]">
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">Tên Sở/Phòng GD</label>
            <input
              type="text"
              value={exam.header.departmentName}
              onChange={(e) =>
                onUpdateExam((p) => ({
                  ...p,
                  header: { ...p.header, departmentName: e.target.value },
                }))
              }
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">Tên Trường</label>
            <input
              type="text"
              value={exam.header.schoolName}
              onChange={(e) =>
                onUpdateExam((p) => ({
                  ...p,
                  header: { ...p.header, schoolName: e.target.value },
                }))
              }
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">Tiêu đề đề kiểm tra</label>
            <input
              type="text"
              value={exam.header.examTitle}
              onChange={(e) =>
                onUpdateExam((p) => ({
                  ...p,
                  title: e.target.value,
                  header: { ...p.header, examTitle: e.target.value },
                }))
              }
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">Mã đề</label>
              <input
                type="text"
                value={exam.header.examCode}
                onChange={(e) =>
                  onUpdateExam((p) => ({
                    ...p,
                    header: { ...p.header, examCode: e.target.value },
                  }))
                }
                className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">Năm học</label>
              <input
                type="text"
                value={exam.header.schoolYear}
                onChange={(e) =>
                  onUpdateExam((p) => ({
                    ...p,
                    header: { ...p.header, schoolYear: e.target.value },
                  }))
                }
                className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quality Audit Drawer */}
      {showAuditDrawer && (
        <div className="no-print border-b border-[#E2E8F0] bg-white px-5 py-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-[#0F172A]">
              KIỂM TRA CHẤT LƯỢNG KỸ THUẬT ĐỀ KIỂM TRA (Cần giáo viên xác nhận trước khi sử dụng)
            </h3>
            <button
              type="button"
              onClick={() => setShowAuditDrawer(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditResults.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 text-[14px] ${
                  item.status === 'pass'
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                    : item.status === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-900'
                      : item.status === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {item.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {(item.status === 'warning' || item.status === 'error') && (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  {item.status === 'unverified' && <HelpCircle className="w-4 h-4 shrink-0" />}
                  <span>{item.label}</span>
                </div>
                <p className="mt-1.5 text-[13px] opacity-90 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Column Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT COLUMN: Config & Question Outline */}
        {leftOpen && (
          <aside className="no-print w-72 lg:w-80 border-r border-[#E2E8F0] bg-white flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-[#E2E8F0] space-y-3 text-[14px]">
              <div className="text-[16px] font-bold text-[#0F172A]">Thiết lập nhanh đề kiểm tra</div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1">Khối lớp</label>
                  <select
                    value={exam.grade}
                    onChange={(e) => {
                      const nextGrade = Number(e.target.value);
                      const validSubs = getSubjectsForGrade(nextGrade);
                      const nextSub = validSubs.includes(exam.subject) ? exam.subject : validSubs[0];
                      onUpdateExam((p) => ({
                        ...p,
                        grade: nextGrade,
                        subject: nextSub,
                        header: {
                          ...p.header,
                          gradeLabel: `Lớp ${nextGrade}`,
                          subjectLabel: nextSub,
                        },
                      }));
                    }}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[14px]"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1">Môn học</label>
                  <select
                    value={exam.subject}
                    onChange={(e) =>
                      onUpdateExam((p) => ({
                        ...p,
                        subject: e.target.value,
                        header: { ...p.header, subjectLabel: e.target.value },
                      }))
                    }
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[14px]"
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Loại đề kiểm tra</label>
                <select
                  value={exam.examType}
                  onChange={(e) => {
                    const t = e.target.value as ExamType;
                    const dur = DEFAULT_EXAM_DURATION[t];
                    onUpdateExam((p) => ({
                      ...p,
                      examType: t,
                      durationMinutes: dur,
                      header: { ...p.header, durationLabel: `${dur} phút` },
                    }));
                  }}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[14px]"
                >
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={exam.durationMinutes}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 15;
                      onUpdateExam((p) => ({
                        ...p,
                        durationMinutes: val,
                        header: { ...p.header, durationLabel: `${val} phút` },
                      }));
                    }}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-[14px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1">Tổng điểm</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={exam.totalPoints}
                    onChange={(e) =>
                      onUpdateExam((p) => ({ ...p, totalPoints: Number(e.target.value) || 10 }))
                    }
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-[14px] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Áp dụng mẫu cấu trúc</label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) applyTemplate(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[14px]"
                >
                  <option value="">-- Chọn mẫu đề (2025 THPT / 15p / 45p) --</option>
                  {EXAM_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 text-[14px] text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={exam.sourceRef.strictSourceMode}
                  onChange={(e) =>
                    onUpdateExam((p) => ({
                      ...p,
                      sourceRef: { ...p.sourceRef, strictSourceMode: e.target.checked },
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-[#2563EB] shrink-0"
                />
                <span>Bắt buộc bám sát nguồn SGK đã xác minh</span>
              </label>
            </div>

            {/* Question List Outline */}
            <div className="p-4 flex-1 space-y-3">
              <div className="flex items-center justify-between text-[15px]">
                <span className="font-bold text-[#0F172A]">
                  Câu hỏi ({sortedQuestions.length})
                </span>
                <span
                  className={`font-mono-tabular text-[14px] font-bold ${
                    Math.abs(totalScore - exam.totalPoints) < 0.01
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {totalScore}/{exam.totalPoints}đ
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => addManualQuestion('mcq')}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  + Trắc nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => addManualQuestion('true_false')}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  + Đúng/Sai
                </button>
                <button
                  type="button"
                  onClick={() => addManualQuestion('short_answer')}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  + Trả lời ngắn
                </button>
                <button
                  type="button"
                  onClick={() => addManualQuestion('essay')}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  + Tự luận
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {sortedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[14px] cursor-pointer border transition-colors ${
                      selectedQuestionId === q.id
                        ? 'border-blue-400 bg-blue-50 text-[#1E40AF] font-semibold'
                        : 'border-transparent hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate">
                      Câu {idx + 1} · {COGNITIVE_LEVEL_LABELS[q.cognitiveLevel]}
                    </span>
                    <span className="text-[13px] font-mono-tabular text-slate-500 shrink-0">
                      {q.points}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Module Shortcuts */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-[14px]">
              <div className="text-[13px] font-bold text-slate-600 uppercase tracking-wide">Hồ sơ liên kết</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('matrix')}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 text-left transition-colors"
                >
                  Ma trận đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('specification')}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 text-left transition-colors"
                >
                  Bảng đặc tả
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('shuffler')}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 text-left transition-colors"
                >
                  Trộn mã đề
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('omr')}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 text-left transition-colors"
                >
                  Phiếu trả lời
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* CENTER COLUMN: A4 Direct Exam Paper Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#EEF2F7] p-3 sm:p-6 print-only-container">
          <div className="a4-sheet exam-paper p-6 sm:p-[18mm]">
            {/* Official Exam Header */}
            <div className="grid grid-cols-12 gap-4 items-start border-b border-black pb-3 mb-4">
              <div className="col-span-5 text-center leading-snug">
                <div className="text-[12pt] uppercase">{exam.header.departmentName}</div>
                <div className="text-[12pt] font-bold uppercase">{exam.header.schoolName}</div>
                <div className="text-[11pt] italic">Năm học {exam.header.schoolYear}</div>
              </div>
              <div className="col-span-7 text-center leading-snug">
                <div className="text-[13pt] font-bold uppercase">{exam.header.examTitle}</div>
                <div className="text-[12pt] font-bold">
                  Môn: {exam.header.subjectLabel} — {exam.header.gradeLabel}
                </div>
                <div className="text-[11pt] italic">
                  Thời gian làm bài: {exam.header.durationLabel} (Mã đề: {exam.header.examCode})
                </div>
              </div>
            </div>

            {exam.header.showStudentInfo && (
              <div className="mb-4 text-[12pt] flex flex-wrap justify-between gap-2 border-b border-dotted border-slate-400 pb-2">
                <span>Họ và tên: ...............................................................</span>
                <span>Lớp: .................</span>
                <span>Số báo danh: .................</span>
              </div>
            )}

            {/* Empty Paper State */}
            {sortedQuestions.length === 0 ? (
              <div className="no-print my-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center font-sans space-y-4">
                <Sparkles className="w-10 h-10 text-[#2563EB] mx-auto" />
                <h3 className="text-[20px] font-bold text-[#0F172A]">
                  Trang đề kiểm tra A4 đang trống
                </h3>
                <p className="text-[16px] text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Chọn bài học SGK ở nút <strong>Nguồn SGK</strong> rồi nhập yêu cầu cho Trợ lý AI ở cột bên phải, hoặc thêm câu hỏi thủ công từ cột bên trái.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onOpenSourceSelector}
                    className="min-h-[44px] rounded-xl bg-[#2563EB] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                  >
                    Chọn bài học SGK ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => addManualQuestion('mcq')}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Thêm câu trắc nghiệm
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {exam.sections.map((section) => {
                  const secQs = sortedQuestions.filter((q) => q.sectionId === section.id);
                  if (secQs.length === 0) return null;
                  return (
                    <div key={section.id} className="space-y-2.5">
                      <div className="font-bold text-[13pt] mt-2">{section.title}</div>
                      {section.description && (
                        <div className="italic text-[12pt] text-slate-800 mb-1">
                          {section.description}
                        </div>
                      )}
                      {secQs.map((q) => renderQuestionBlock(q))}
                    </div>
                  );
                })}

                {/* Any questions whose sectionId isn't in exam.sections */}
                {sortedQuestions
                  .filter((q) => !exam.sections.some((s) => s.id === q.sectionId))
                  .map((q) => renderQuestionBlock(q))}
              </div>
            )}

            {/* Answer Key & Solutions on Print / Preview */}
            {(showAnswersInPaper || showSolutionsInPaper) && sortedQuestions.length > 0 && (
              <div className="page-break mt-8 pt-6 border-t-2 border-slate-800 space-y-4">
                <div className="text-center font-bold text-[13pt] uppercase">
                  ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM — MÃ ĐỀ {exam.header.examCode}
                </div>
                <table className="w-full border-collapse border border-black text-[12pt]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-black px-2 py-1">Câu</th>
                      <th className="border border-black px-2 py-1">Dạng câu</th>
                      <th className="border border-black px-2 py-1">Đáp án</th>
                      <th className="border border-black px-2 py-1">Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQuestions.map((q, idx) => (
                      <tr key={q.id}>
                        <td className="border border-black px-2 py-1 text-center font-bold">
                          Câu {idx + 1}
                        </td>
                        <td className="border border-black px-2 py-1">
                          {QUESTION_TYPE_LABELS[q.type]}
                        </td>
                        <td className="border border-black px-2 py-1 text-center font-bold">
                          <MathText text={q.correctAnswer} />
                        </td>
                        <td className="border border-black px-2 py-1 text-center">{q.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showSolutionsInPaper && (
                  <div className="space-y-2 pt-2">
                    <div className="font-bold text-[13pt]">HƯỚNG DẪN GIẢI CHI TIẾT</div>
                    {sortedQuestions.map((q, idx) => (
                      <div key={q.id} className="text-[12pt] avoid-break">
                        <strong>Câu {idx + 1}: </strong>
                        <MathText text={q.explanation || 'Chưa có lời giải chi tiết.'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: AI Assistant / Visual Formula Builder / Scientific Diagrams */}
        {rightOpen && (
          <aside className="no-print w-80 lg:w-[400px] border-l border-[#E2E8F0] bg-white flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setRightTab('ai')}
                className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                  rightTab === 'ai'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-4 h-4" />
                Trợ lý AI
              </button>
              <button
                type="button"
                onClick={() => setRightTab('formula')}
                className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                  rightTab === 'formula'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FunctionSquare className="w-4 h-4" />
                Công thức
              </button>
              <button
                type="button"
                onClick={() => setRightTab('diagram')}
                className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[14px] font-semibold transition-colors ${
                  rightTab === 'diagram'
                    ? 'bg-white text-[#2563EB] shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shapes className="w-4 h-4" />
                Hình khoa học
              </button>
            </div>

            {rightTab === 'ai' && (
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Persistent Source Banner */}
                <div className="border-b border-[#E2E8F0] p-3.5 bg-blue-50/50 space-y-2 text-[14px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#0F172A]">Nguồn kiến thức đang gắn</span>
                    <button
                      type="button"
                      onClick={onOpenSourceSelector}
                      className="text-[14px] text-[#2563EB] hover:underline font-semibold"
                    >
                      Thay đổi nguồn
                    </button>
                  </div>
                  <div className="text-[13px] text-slate-600">
                    {exam.sourceRef.series} · Lớp {exam.grade} · Môn {exam.subject}
                  </div>
                  {selectedLessons.length === 0 && selectedDocs.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800 leading-relaxed">
                      Chưa chọn bài SGK hoặc tài liệu nào. Hãy bấm <strong>Chọn bài SGK</strong> để AI ra đề bám sát kiến thức.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {selectedLessons.map((l) => (
                        <span
                          key={l.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[13px] text-slate-800"
                        >
                          {l.lessonNumber}: {l.lessonTitle}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateExam((p) => ({
                                ...p,
                                sourceRef: {
                                  ...p.sourceRef,
                                  lessonIds: p.sourceRef.lessonIds.filter((id) => id !== l.id),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600"
                            title="Loại bỏ bài này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {selectedDocs.map((d) => (
                        <span
                          key={d.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[13px] text-slate-800"
                        >
                          {d.title}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateExam((p) => ({
                                ...p,
                                sourceRef: {
                                  ...p.sourceRef,
                                  documentIds: p.sourceRef.documentIds.filter((id) => id !== d.id),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-[15px]">
                  {aiMessages.length === 0 && (
                    <div className="space-y-2.5 text-slate-600">
                      <p className="font-semibold text-[#0F172A]">Gợi ý yêu cầu nhanh:</p>
                      {[
                        `Tạo đề kiểm tra 15 phút môn ${exam.subject} ${exam.grade}, gồm 10 câu trắc nghiệm bám sát các bài đã chọn.`,
                        `Tạo đề kiểm tra 45 phút môn ${exam.subject} ${exam.grade} gồm trắc nghiệm, đúng/sai và tự luận.`,
                        'Kiểm tra toàn bộ đáp án và tổng điểm của đề hiện tại.',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAiSend(preset)}
                          className="w-full text-left rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-[14px] leading-relaxed hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}

                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl p-3.5 space-y-2.5 ${
                        msg.role === 'user'
                          ? 'bg-[#2563EB] text-white ml-6'
                          : msg.error
                            ? 'bg-rose-50 border border-rose-200 text-rose-900 mr-2'
                            : 'bg-slate-100 text-[#0F172A] mr-2'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                      {msg.sourceLessonsUsed && msg.sourceLessonsUsed.length > 0 && (
                        <div className="text-[13px] opacity-80">
                          Nguồn đã bám sát: {msg.sourceLessonsUsed.join('; ')}
                        </div>
                      )}

                      {msg.error && lastFailedPrompt && !aiBusy && (
                        <button
                          type="button"
                          onClick={() => handleAiSend(lastFailedPrompt)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-rose-300 px-3 py-1.5 text-[14px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Thử lại
                        </button>
                      )}

                      {msg.generatedQuestions && msg.generatedQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              insertAiQuestionsToExam(msg.generatedQuestions!, false);
                              toast.success('Đã chèn thêm câu hỏi AI vào đề.');
                            }}
                            className="min-h-[38px] rounded-lg bg-[#2563EB] px-3 py-1.5 text-[14px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                          >
                            Chèn thêm vào đề
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              insertAiQuestionsToExam(msg.generatedQuestions!, true);
                              toast.success('Đã thay thế đề kiểm tra bằng bộ câu hỏi mới.');
                            }}
                            className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                          >
                            Thay toàn bộ đề
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {aiBusy && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 mr-2 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-semibold text-[#1E40AF]">{aiStage}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-typing-dot" />
                          <span
                            className="h-2 w-2 rounded-full bg-[#2563EB] animate-typing-dot"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-[#2563EB] animate-typing-dot"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
                        <div className="h-full w-2/5 rounded-full bg-[#2563EB] animate-indeterminate-bar" />
                      </div>
                      <div className="space-y-1.5 pt-1 opacity-60">
                        <div className="h-3 rounded bg-blue-200/70 w-11/12" />
                        <div className="h-3 rounded bg-blue-200/70 w-3/4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Prompt Controls */}
                <div className="border-t border-[#E2E8F0] p-3.5 space-y-2.5 bg-white">
                  {lastAiSnapshot && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateExam(() => lastAiSnapshot);
                        setLastAiSnapshot(null);
                        toast.info('Đã hoàn tác thay đổi gần nhất do AI thực hiện.');
                      }}
                      className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 py-1.5 text-[14px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Hoàn tác thay đổi gần nhất do AI
                    </button>
                  )}

                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Nhập yêu cầu bằng tiếng Việt tự nhiên (VD: Tạo 10 câu trắc nghiệm bám sát bài Mệnh đề...)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 leading-relaxed focus:border-[#2563EB] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleAiSend();
                      }
                    }}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={onOpenSourceSelector}
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      Chọn bài SGK
                    </button>

                    {aiBusy ? (
                      <button
                        type="button"
                        onClick={() => abortControllerRef.current?.abort()}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[15px] font-semibold text-white hover:bg-rose-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Hủy tạo đề
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!aiPrompt.trim()}
                        onClick={() => handleAiSend()}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-[15px] font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Gửi yêu cầu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'formula' && (
              <div className="flex-1 overflow-y-auto p-3.5">
                <FormulaBuilder
                  initialLatex={formulaInitialLatex}
                  defaultSubject={exam.subject}
                  onInsertFormula={insertFormulaIntoSelected}
                />
              </div>
            )}

            {rightTab === 'diagram' && (
              <div className="flex-1 overflow-y-auto p-3.5">
                <ScientificDiagramBuilder
                  subject={exam.subject}
                  onInsertDiagram={insertDiagramIntoSelected}
                />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );

  function renderQuestionBlock(q: ExamQuestion) {
    const isSelected = selectedQuestionId === q.id;
    const isEditing = editingQuestionId === q.id;

    return (
      <div
        key={q.id}
        onClick={() => setSelectedQuestionId(q.id)}
        className={`avoid-break group relative rounded-lg p-2 transition-colors ${
          isSelected ? 'bg-blue-50/40 ring-1 ring-blue-300 print:bg-transparent print:ring-0' : 'hover:bg-slate-50/60 print:hover:bg-transparent'
        }`}
      >
        {/* Question quick action bar (hidden in print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-2 text-[13px] font-sans text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E40AF]">
              Câu {q.orderIndex + 1} · {q.points}đ · {COGNITIVE_LEVEL_LABELS[q.cognitiveLevel]}
            </span>
            {q.sourceLessonId && (
              <span className="text-slate-400">· Nguồn: {q.sourceLessonId}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 opacity-90 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingQuestionId(isEditing ? null : q.id);
              }}
              className="min-h-[34px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
            >
              {isEditing ? 'Xong' : 'Sửa trực tiếp'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAiEditSingleQuestion(q, 'Tạo câu hỏi tương đương thay đổi số liệu/ngữ cảnh nhưng giữ nguyên kiến thức.');
              }}
              className="min-h-[34px] rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1 text-[13px] font-medium text-[#1E40AF] hover:bg-blue-100"
              title="Yêu cầu AI tạo câu tương đương"
            >
              AI tương đương
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveQuestionToBank(q);
              }}
              className="min-h-[34px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
              title="Lưu vào ngân hàng câu hỏi"
            >
              + Ngân hàng
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateQuestion(q.id, { lockedOrder: !q.lockedOrder });
              }}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg hover:bg-slate-200"
              title={q.lockedOrder ? 'Đã khóa vị trí khi trộn đề' : 'Khóa vị trí khi trộn đề'}
            >
              {q.lockedOrder ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(q.id, -1);
              }}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg hover:bg-slate-200"
              title="Di chuyển lên"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                moveQuestion(q.id, 1);
              }}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg hover:bg-slate-200"
              title="Di chuyển xuống"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                duplicateQuestion(q);
              }}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg hover:bg-slate-200"
              title="Nhân bản câu hỏi"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteQuestion(q.id);
              }}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
              title="Xóa câu hỏi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Mode or Direct Inline Edit Mode */}
        {isEditing ? (
          <div className="no-print space-y-3 rounded-xl border border-blue-200 bg-white p-4 font-sans text-[14px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Dạng câu</label>
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-[14px]"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Mức độ</label>
                <select
                  value={q.cognitiveLevel}
                  onChange={(e) =>
                    updateQuestion(q.id, { cognitiveLevel: e.target.value as CognitiveLevel })
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-[14px]"
                >
                  {Object.entries(COGNITIVE_LEVEL_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Điểm số</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  value={q.points}
                  onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) || 0 })}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-[14px] tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-1">
                Nội dung câu hỏi (bọc công thức trong $...$)
              </label>
              <textarea
                rows={3}
                value={q.stem}
                onChange={(e) => updateQuestion(q.id, { stem: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] leading-relaxed"
              />
            </div>

            {q.type === 'mcq' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                  <div key={lbl}>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1">Phương án {lbl}</label>
                    <input
                      type="text"
                      value={q.options?.[idx] || ''}
                      onChange={(e) => {
                        const nextOpts = [...(q.options || ['', '', '', ''])];
                        nextOpts[idx] = e.target.value;
                        updateQuestion(q.id, { options: nextOpts });
                      }}
                      className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-[15px]"
                    />
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && q.trueFalseItems && (
              <div className="space-y-2">
                {q.trueFalseItems.map((it, idx) => (
                  <div key={it.label} className="flex items-center gap-2">
                    <span className="font-bold w-5 text-[15px]">{it.label})</span>
                    <input
                      type="text"
                      value={it.statement}
                      onChange={(e) => {
                        const next = q.trueFalseItems!.map((x, i) =>
                          i === idx ? { ...x, statement: e.target.value } : x
                        );
                        updateQuestion(q.id, { trueFalseItems: next });
                      }}
                      className="flex-1 min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-[15px]"
                    />
                    <select
                      value={it.isTrue ? 'true' : 'false'}
                      onChange={(e) => {
                        const next = q.trueFalseItems!.map((x, i) =>
                          i === idx ? { ...x, isTrue: e.target.value === 'true' } : x
                        );
                        const summary = next.map((x) => `${x.label}-${x.isTrue ? 'Đ' : 'S'}`).join('; ');
                        updateQuestion(q.id, { trueFalseItems: next, correctAnswer: summary });
                      }}
                      className="min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-[14px]"
                    >
                      <option value="true">Đúng</option>
                      <option value="false">Sai</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Đáp án</label>
                <input
                  type="text"
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-[15px]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-1">Lời giải / Hướng dẫn chấm</label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-[15px]"
                />
              </div>
            </div>

            {q.diagram && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
                <span>Hình kèm theo: {q.diagram.title}</span>
                <button
                  type="button"
                  onClick={() => updateQuestion(q.id, { diagram: undefined })}
                  className="text-rose-600 font-medium hover:underline"
                >
                  Gỡ hình vẽ
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {q.sharedPassage && (
              <div className="italic text-[12pt] mb-1.5 text-slate-800">
                <MathText text={q.sharedPassage} />
              </div>
            )}
            <div className="leading-relaxed">
              <strong>Câu {q.orderIndex + 1}: </strong>
              <MathText
                text={q.stem}
                onFormulaClick={(latex) => {
                  setFormulaInitialLatex(latex);
                  setRightOpen(true);
                  setRightTab('formula');
                }}
              />
            </div>

            {q.diagram?.svgMarkup && (
              <div
                className="my-2 flex justify-center"
                dangerouslySetInnerHTML={{ __html: q.diagram.svgMarkup }}
              />
            )}

            {q.type === 'mcq' && q.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pl-4 mt-1.5">
                {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                  <div key={lbl}>
                    <strong>{lbl}. </strong>
                    <MathText text={q.options?.[idx] || ''} />
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && q.trueFalseItems && (
              <div className="pl-4 mt-1.5 space-y-0.5">
                {q.trueFalseItems.map((it) => (
                  <div key={it.label}>
                    <strong>{it.label}) </strong>
                    <MathText text={it.statement} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
};
