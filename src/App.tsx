import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  ClipboardCheck,
  Database,
  FileEdit,
  Grid3X3,
  HelpCircle,
  Home,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shuffle,
  TableProperties,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import {
  AppModuleId,
  AppSettings,
  ExamDocument,
  ExamMatrix,
  ExamQuestion,
  ExamSpecification,
  TextbookLesson,
  UserDocument,
} from './types';
import {
  DEFAULT_SETTINGS,
  getAllFromStore,
  initializeDatabase,
  logAudit,
  putToStore,
  deleteFromStore,
} from './services/indexedDb';
import { TEXTBOOK_SERIES } from './data/curriculum';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SourceSelectorModal } from './components/SourceSelectorModal';
import { PresentationMode } from './components/PresentationMode';
import { useToast } from './components/ToastProvider';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { HomePage } from './pages/HomePage';
import { ExamEditorPage } from './pages/ExamEditorPage';
import { TextbookLibraryPage } from './pages/TextbookLibraryPage';
import { MatrixAndSpecPage } from './pages/MatrixAndSpecPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { ExamVaultPage } from './pages/ExamVaultPage';
import { ShufflerPage } from './pages/ShufflerPage';
import { OmrSheetPage } from './pages/OmrSheetPage';
import { ToolsPage } from './pages/ToolsPage';
import { GuidePage, SettingsPage } from './pages/GuideAndSettingsPage';

function createFreshExam(seq: number, settings: AppSettings): ExamDocument {
  const now = new Date().toISOString();
  const id = `exam-${Date.now()}`;
  return {
    id,
    code: `DE-${String(seq).padStart(3, '0')}`,
    sequenceNumber: seq,
    title: `ĐỀ KIỂM TRA #${seq}`,
    examType: '15min',
    subject: 'Toán',
    grade: 10,
    durationMinutes: 15,
    totalPoints: 10,
    status: 'draft',
    header: {
      departmentName: settings.departmentName,
      schoolName: settings.schoolName,
      subjectGroup: settings.subjectGroup,
      schoolYear: settings.schoolYear,
      examTitle: `ĐỀ KIỂM TRA 15 PHÚT`,
      subjectLabel: 'Toán',
      gradeLabel: 'Lớp 10',
      durationLabel: '15 phút',
      examCode: '101',
      showStudentInfo: true,
    },
    sections: [
      {
        id: 'sec-1',
        title: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        description: 'Chọn phương án trả lời đúng nhất cho mỗi câu hỏi.',
        questionType: 'mcq',
        pointsPerQuestion: 1.0,
      },
    ],
    questions: [],
    sourceRef: {
      lessonIds: ['kntt-toan10-t1-c1-b1'],
      unitIds: ['u-toan10-c1b1-1', 'u-toan10-c1b1-2', 'u-toan10-c1b1-3'],
      documentIds: [],
      series: TEXTBOOK_SERIES[0],
      grade: 10,
      subject: 'Toán',
      strictSourceMode: true,
      capturedAt: now,
    },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function createFreshMatrix(exam: ExamDocument): ExamMatrix {
  return {
    id: exam.matrixId || `mat-${exam.id}`,
    title: exam.title,
    subject: exam.subject,
    grade: exam.grade,
    durationMinutes: exam.durationMinutes,
    totalPoints: exam.totalPoints,
    examId: exam.id,
    rows: [],
    updatedAt: new Date().toISOString(),
  };
}

function createFreshSpec(exam: ExamDocument, matrixId?: string): ExamSpecification {
  return {
    id: exam.specificationId || `spec-${exam.id}`,
    matrixId,
    examId: exam.id,
    title: exam.title,
    subject: exam.subject,
    grade: exam.grade,
    rows: [],
    updatedAt: new Date().toISOString(),
  };
}

const NAV_ITEMS: { id: AppModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Trang chủ', icon: Home },
  { id: 'editor', label: 'Soạn đề kiểm tra', icon: FileEdit },
  { id: 'textbooks', label: 'Kho kiến thức SGK', icon: BookOpen },
  { id: 'matrix', label: 'Ma trận đề', icon: Grid3X3 },
  { id: 'specification', label: 'Bảng đặc tả', icon: TableProperties },
  { id: 'bank', label: 'Ngân hàng câu hỏi', icon: Database },
  { id: 'vault', label: 'Kho đề kiểm tra', icon: Archive },
  { id: 'shuffler', label: 'Trộn đề', icon: Shuffle },
  { id: 'omr', label: 'Phiếu trả lời', icon: ClipboardCheck },
  { id: 'tools', label: 'Công cụ hỗ trợ', icon: Wrench },
  { id: 'guide', label: 'Hướng dẫn sử dụng', icon: HelpCircle },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export default function App() {
  const isOnline = useOnlineStatus();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [activeModule, setActiveModule] = useState<AppModuleId>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lessons, setLessons] = useState<TextbookLesson[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [questionBank, setQuestionBank] = useState<ExamQuestion[]>([]);
  const [matrices, setMatrices] = useState<ExamMatrix[]>([]);
  const [specs, setSpecs] = useState<ExamSpecification[]>([]);

  const [activeExam, setActiveExam] = useState<ExamDocument>(() =>
    createFreshExam(1, DEFAULT_SETTINGS)
  );
  const [undoStack, setUndoStack] = useState<ExamDocument[]>([]);
  const [redoStack, setRedoStack] = useState<ExamDocument[]>([]);
  const [saveStatus, setSaveStatus] = useState('Chưa lưu');

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);

  const autoSaveTimerRef = useRef<number | null>(null);

  // Apply root UI font size & motion level whenever settings change
  useEffect(() => {
    const uiFontSize = settings.uiFontSize || 16;
    const motionLevel = settings.motionLevel || 'gentle';
    document.documentElement.style.setProperty('--ui-font-size', `${uiFontSize}px`);
    document.documentElement.dataset.motion = motionLevel;
    try {
      localStorage.setItem('sd_ui_prefs', JSON.stringify({ uiFontSize, motionLevel }));
    } catch {
      // Non-blocking
    }
  }, [settings.uiFontSize, settings.motionLevel]);

  // Pause background ambient animations when browser tab is inactive
  useEffect(() => {
    const handleVisibility = () => {
      document.documentElement.classList.toggle('tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const loadAllData = useCallback(async () => {
    await initializeDatabase();
    const [
      loadedSettings,
      loadedLessons,
      loadedDocs,
      loadedExams,
      loadedBank,
      loadedMatrices,
      loadedSpecs,
    ] = await Promise.all([
      getAllFromStore<AppSettings>('settings'),
      getAllFromStore<TextbookLesson>('textbookLessons'),
      getAllFromStore<UserDocument>('userDocuments'),
      getAllFromStore<ExamDocument>('exams'),
      getAllFromStore<ExamQuestion>('questionBank'),
      getAllFromStore<ExamMatrix>('matrices'),
      getAllFromStore<ExamSpecification>('specifications'),
    ]);

    const currentSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...(loadedSettings[0] || {}),
    };
    setSettings(currentSettings);
    setLessons(loadedLessons);
    setDocuments(loadedDocs);
    setExams(loadedExams);
    setQuestionBank(loadedBank);
    setMatrices(loadedMatrices);
    setSpecs(loadedSpecs);

    const activeDrafts = loadedExams
      .filter((e) => !e.isDeleted)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    if (activeDrafts.length > 0) {
      setActiveExam(activeDrafts[0]);
      setSaveStatus('Đã khôi phục đề gần nhất');
    } else {
      const fresh = createFreshExam(1, currentSettings);
      setActiveExam(fresh);
      setSaveStatus('Bản nháp mới');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    loadAllData().catch((err) => {
      console.error('Database initialization error:', err);
      setReady(true);
    });
  }, [loadAllData]);

  const persistExam = useCallback(
    async (examToSave: ExamDocument, showToastOnManual = false) => {
      setSaveStatus('Đang lưu...');
      try {
        const stamped: ExamDocument = {
          ...examToSave,
          updatedAt: new Date().toISOString(),
        };
        await putToStore('exams', stamped);
        setExams((prev) => {
          const exists = prev.some((e) => e.id === stamped.id);
          return exists ? prev.map((e) => (e.id === stamped.id ? stamped : e)) : [stamped, ...prev];
        });
        const timeStr = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setSaveStatus(`Đã lưu lúc ${timeStr}`);
        if (showToastOnManual) {
          toast.saved(`Đã lưu "${stamped.title}" vào kho đề.`);
        }
      } catch {
        setSaveStatus('Lỗi lưu dữ liệu');
        toast.error('Không thể lưu đề kiểm tra vào bộ nhớ trình duyệt.');
      }
    },
    [toast]
  );

  const updateActiveExam = useCallback(
    (updater: (prev: ExamDocument) => ExamDocument) => {
      setActiveExam((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        setUndoStack((u) => [...u.slice(-24), prev]);
        setRedoStack([]);
        setSaveStatus('Chưa lưu thay đổi');

        if (autoSaveTimerRef.current) {
          window.clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = window.setTimeout(() => {
          persistExam(next);
        }, 1200);

        return next;
      });
    },
    [persistExam]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, activeExam]);
    setActiveExam(prev);
    persistExam(prev);
    toast.info('Đã hoàn tác thao tác.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, activeExam]);
    setActiveExam(next);
    persistExam(next);
    toast.info('Đã khôi phục thao tác.');
  };

  const handleCreateNewExam = () => {
    const maxSeq = exams.reduce((m, e) => Math.max(m, e.sequenceNumber || 0), 0);
    const fresh = createFreshExam(maxSeq + 1, settings);
    setUndoStack([]);
    setRedoStack([]);
    setActiveExam(fresh);
    persistExam(fresh);
    setActiveModule('editor');
    toast.success(`Đã tạo bản nháp mới: ${fresh.title}`);
  };

  const handleOpenExam = (id: string) => {
    const found = exams.find((e) => e.id === id);
    if (!found) return;
    setUndoStack([]);
    setRedoStack([]);
    setActiveExam(found);
    setSaveStatus('Đã mở từ kho đề');
    setActiveModule('editor');
  };

  const activeMatrix = useMemo(() => {
    return (
      matrices.find((m) => m.id === activeExam.matrixId || m.examId === activeExam.id) ||
      createFreshMatrix(activeExam)
    );
  }, [matrices, activeExam]);

  const activeSpec = useMemo(() => {
    return (
      specs.find((s) => s.id === activeExam.specificationId || s.examId === activeExam.id) ||
      createFreshSpec(activeExam, activeMatrix.id)
    );
  }, [specs, activeExam, activeMatrix.id]);

  const handleSaveMatrix = async (m: ExamMatrix) => {
    await putToStore('matrices', m);
    setMatrices((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]));
    if (activeExam.matrixId !== m.id) {
      updateActiveExam((p) => ({ ...p, matrixId: m.id }));
    }
  };

  const handleSaveSpec = async (s: ExamSpecification) => {
    await putToStore('specifications', s);
    setSpecs((prev) => (prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev]));
    if (activeExam.specificationId !== s.id) {
      updateActiveExam((p) => ({ ...p, specificationId: s.id }));
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F5F7FB] text-base text-[#475569]">
        <div className="w-48 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-indeterminate" />
        </div>
        <span>Đang khởi tạo dữ liệu học liệu ngoại tuyến...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-[#0F172A]">
      {/* Top Bar (64px height, clear typography & touch-friendly CTA) */}
      <header className="no-print sticky top-0 z-30 h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden rounded-xl p-2 text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] cursor-pointer"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:inline-flex items-center justify-center rounded-xl p-2 text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('home')}
            className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[#1E40AF] hover:text-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            SOẠN ĐỀ THÔNG MINH AI
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D97706] bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
              <WifiOff className="w-4 h-4" />
              Ngoại tuyến
            </span>
          )}
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setActiveModule('editor')}
            className="rounded-xl bg-[#2563EB] px-4 sm:px-5 min-h-[44px] text-[15px] sm:text-base font-semibold text-white hover:bg-[#1E40AF] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
          >
            Soạn đề ngay
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <aside
          className={`no-print motion-transition hidden lg:flex flex-col border-r border-[#E2E8F0] bg-white shrink-0 transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-[68px]' : 'w-64'
          }`}
        >
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={`group relative w-full flex items-center ${
                    sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
                  } min-h-[44px] rounded-xl text-[15px] leading-snug transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#DBEAFE]/70 text-[#1E40AF] font-semibold'
                      : 'text-[#0F172A] font-medium hover:bg-slate-100/80'
                  }`}
                >
                  {active && !sidebarCollapsed && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#2563EB]"
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      active ? 'text-[#2563EB]' : 'text-[#475569] group-hover:text-[#0F172A]'
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate text-left">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Slide-Over Drawer */}
        {mobileNavOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 h-16 border-b border-[#E2E8F0]">
                <span className="font-bold text-[18px] text-[#1E40AF]">SOẠN ĐỀ THÔNG MINH AI</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 rounded-xl text-[#475569] hover:bg-slate-100"
                  aria-label="Đóng menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveModule(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`relative w-full flex items-center gap-3 rounded-xl px-3.5 min-h-[46px] text-base transition-colors ${
                        active
                          ? 'bg-[#DBEAFE]/70 text-[#1E40AF] font-semibold'
                          : 'text-[#0F172A] font-medium hover:bg-slate-100'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#2563EB]"
                        />
                      )}
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#2563EB]' : 'text-[#475569]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Workspace Viewport */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div key={activeModule} className="animate-fade-slide-up h-full">
              {activeModule === 'home' && (
                <HomePage
                  exams={exams}
                  questionBank={questionBank}
                  lessons={lessons}
                  documents={documents}
                  motionLevel={settings.motionLevel || 'gentle'}
                  onNavigate={setActiveModule}
                  onStartAiExam={() => {
                    setActiveModule('editor');
                  }}
                  onStartManualExam={handleCreateNewExam}
                  onOpenSourceSelector={() => setSourceModalOpen(true)}
                  onOpenExam={handleOpenExam}
                />
              )}

              {activeModule === 'editor' && (
                <ExamEditorPage
                  exam={activeExam}
                  lessons={lessons}
                  documents={documents}
                  matrix={activeMatrix}
                  spec={activeSpec}
                  saveStatus={saveStatus}
                  onUpdateExam={updateActiveExam}
                  onSaveNow={() => persistExam(activeExam, true)}
                  onNewExam={handleCreateNewExam}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                  onOpenSourceSelector={() => setSourceModalOpen(true)}
                  onOpenPresentation={() => setPresentationOpen(true)}
                  onSaveQuestionToBank={async (q) => {
                    const bankItem: ExamQuestion = {
                      ...structuredClone(q),
                      id: `qb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      subject: activeExam.subject,
                      grade: activeExam.grade,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await putToStore('questionBank', bankItem);
                    setQuestionBank((prev) => [bankItem, ...prev]);
                    toast.success(`Đã lưu Câu ${q.orderIndex + 1} vào ngân hàng câu hỏi.`);
                  }}
                  onNavigateTab={(tab) => setActiveModule(tab)}
                />
              )}

              {activeModule === 'textbooks' && (
                <TextbookLibraryPage
                  role={settings.role}
                  lessons={lessons}
                  documents={documents}
                  onSaveLesson={async (lesson) => {
                    await putToStore('textbookLessons', lesson);
                    setLessons((prev) =>
                      prev.some((l) => l.id === lesson.id)
                        ? prev.map((l) => (l.id === lesson.id ? lesson : l))
                        : [lesson, ...prev]
                    );
                    toast.saved(`Đã cập nhật bài học: ${lesson.lessonTitle}`);
                  }}
                  onDeleteLesson={async (id) => {
                    await deleteFromStore('textbookLessons', id);
                    setLessons((prev) => prev.filter((l) => l.id !== id));
                    toast.info('Đã xóa bài học khỏi kho.');
                  }}
                  onSaveDocument={async (doc) => {
                    await putToStore('userDocuments', doc);
                    setDocuments((prev) => [doc, ...prev]);
                    toast.success(`Đã lưu tài liệu "${doc.title}" vào Kho của tôi.`);
                  }}
                  onDeleteDocument={async (id) => {
                    await deleteFromStore('userDocuments', id);
                    setDocuments((prev) => prev.filter((d) => d.id !== id));
                    toast.info('Đã xóa tài liệu cá nhân.');
                  }}
                  onUseLessonInExam={(lesson) => {
                    updateActiveExam((p) => ({
                      ...p,
                      grade: lesson.grade,
                      subject: lesson.subject,
                      header: {
                        ...p.header,
                        gradeLabel: `Lớp ${lesson.grade}`,
                        subjectLabel: lesson.subject,
                      },
                      sourceRef: {
                        ...p.sourceRef,
                        grade: lesson.grade,
                        subject: lesson.subject,
                        series: lesson.series,
                        lessonIds: Array.from(new Set([...p.sourceRef.lessonIds, lesson.id])),
                      },
                    }));
                    setActiveModule('editor');
                    toast.success(`Đã gắn nguồn "${lesson.lessonNumber}. ${lesson.lessonTitle}" vào đề.`);
                  }}
                />
              )}

              {(activeModule === 'matrix' || activeModule === 'specification') && (
                <MatrixAndSpecPage
                  key={activeModule}
                  initialTab={activeModule === 'specification' ? 'specification' : 'matrix'}
                  exam={activeExam}
                  lessons={lessons}
                  matrix={activeMatrix}
                  spec={activeSpec}
                  onSaveMatrix={handleSaveMatrix}
                  onSaveSpec={handleSaveSpec}
                  onApplyQuestionsToExam={(qs, sections) => {
                    updateActiveExam((p) => ({ ...p, questions: qs, sections }));
                    setActiveModule('editor');
                    toast.success(`Đã đưa ${qs.length} câu hỏi khớp ma trận vào trình soạn thảo.`);
                  }}
                />
              )}

              {activeModule === 'bank' && (
                <QuestionBankPage
                  questions={questionBank}
                  lessons={lessons}
                  activeMatrix={activeMatrix}
                  onSaveQuestion={async (q) => {
                    await putToStore('questionBank', q);
                    setQuestionBank((prev) =>
                      prev.some((x) => x.id === q.id) ? prev.map((x) => (x.id === q.id ? q : x)) : [q, ...prev]
                    );
                    toast.saved('Đã lưu câu hỏi vào ngân hàng.');
                  }}
                  onDeleteQuestion={async (id) => {
                    await deleteFromStore('questionBank', id);
                    setQuestionBank((prev) => prev.filter((q) => q.id !== id));
                    toast.info('Đã xóa câu hỏi khỏi ngân hàng.');
                  }}
                  onAddQuestionsToExam={(qs) => {
                    updateActiveExam((p) => {
                      const secId = p.sections[0]?.id || 'sec-1';
                      const appended = qs.map((q, idx) => ({
                        ...structuredClone(q),
                        id: `q-bank-${Date.now()}-${idx}`,
                        orderIndex: p.questions.length + idx,
                        sectionId: secId,
                      }));
                      return { ...p, questions: [...p.questions, ...appended] };
                    });
                    setActiveModule('editor');
                    toast.success(`Đã chèn ${qs.length} câu hỏi vào đề đang soạn.`);
                  }}
                />
              )}

              {activeModule === 'vault' && (
                <ExamVaultPage
                  exams={exams}
                  onOpenExam={handleOpenExam}
                  onDuplicateExam={async (ex) => {
                    const maxSeq = exams.reduce((m, e) => Math.max(m, e.sequenceNumber || 0), 0);
                    const copy: ExamDocument = {
                      ...structuredClone(ex),
                      id: `exam-${Date.now()}`,
                      sequenceNumber: maxSeq + 1,
                      code: `DE-${String(maxSeq + 1).padStart(3, '0')}`,
                      title: `${ex.title} (Bản sao)`,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await putToStore('exams', copy);
                    setExams((prev) => [copy, ...prev]);
                    toast.success(`Đã nhân bản thành "${copy.title}".`);
                  }}
                  onSaveExam={async (ex) => {
                    await putToStore('exams', ex);
                    setExams((prev) => prev.map((e) => (e.id === ex.id ? ex : e)));
                    if (activeExam.id === ex.id) setActiveExam(ex);
                    toast.saved();
                  }}
                  onShuffleExam={(id) => {
                    handleOpenExam(id);
                    setActiveModule('shuffler');
                  }}
                />
              )}

              {activeModule === 'shuffler' && (
                <ShufflerPage exams={exams} activeExam={activeExam} />
              )}

              {activeModule === 'omr' && <OmrSheetPage activeExam={activeExam} />}

              {activeModule === 'tools' && (
                <ToolsPage
                  activeExam={activeExam}
                  lessons={lessons}
                  matrix={activeMatrix}
                  spec={activeSpec}
                  onUpdateExam={updateActiveExam}
                  onNavigateEditor={() => setActiveModule('editor')}
                />
              )}

              {activeModule === 'guide' && <GuidePage />}

              {activeModule === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onSaveSettings={async (s) => {
                    await putToStore('settings', s);
                    setSettings(s);
                    await logAudit('UPDATE_SETTINGS', 'Cập nhật cấu hình hệ thống');
                    toast.saved('Đã lưu cấu hình hệ thống và giao diện.');
                  }}
                  onAfterRestore={async () => {
                    await loadAllData();
                    toast.success('Đã khôi phục toàn bộ dữ liệu từ bản sao lưu.');
                  }}
                />
              )}
            </div>
          </div>

          {/* Global Footer */}
          {activeModule !== 'editor' && (
            <footer className="no-print border-t border-[#E2E8F0] bg-white px-6 py-3.5 text-center text-[13px] sm:text-[14px] text-[#475569]">
              Copyright © 2026 – Phát triển bởi Thầy Hồ Nguyễn Đa Thiện.
            </footer>
          )}
        </div>
      </div>

      {/* Source Selector Modal */}
      <SourceSelectorModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        lessons={lessons}
        documents={documents}
        initialGrade={activeExam.grade}
        initialSubject={activeExam.subject}
        initialSelectedLessonIds={activeExam.sourceRef.lessonIds}
        initialSelectedUnitIds={activeExam.sourceRef.unitIds}
        initialSelectedDocIds={activeExam.sourceRef.documentIds}
        onConfirm={(payload) => {
          updateActiveExam((p) => ({
            ...p,
            grade: payload.grade,
            subject: payload.subject,
            header: {
              ...p.header,
              gradeLabel: `Lớp ${payload.grade}`,
              subjectLabel: payload.subject,
            },
            sourceRef: {
              ...p.sourceRef,
              grade: payload.grade,
              subject: payload.subject,
              series: payload.series,
              lessonIds: payload.lessonIds,
              unitIds: payload.unitIds,
              documentIds: payload.documentIds,
              capturedAt: new Date().toISOString(),
            },
          }));
          toast.success(
            `Đã gắn ${payload.lessonIds.length} bài SGK và ${payload.documentIds.length} tài liệu làm nguồn.`
          );
        }}
      />

      {/* Presentation Mode Overlay */}
      {presentationOpen && (
        <PresentationMode exam={activeExam} onClose={() => setPresentationOpen(false)} />
      )}
    </div>
  );
}
