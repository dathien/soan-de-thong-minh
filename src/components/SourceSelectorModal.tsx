import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { TextbookLesson, UserDocument } from '../types';
import { GRADES, TEXTBOOK_SERIES, getSubjectsForGrade } from '../data/curriculum';
import { MathText } from './MathText';

interface SourceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: TextbookLesson[];
  documents: UserDocument[];
  initialGrade: number;
  initialSubject: string;
  initialSelectedLessonIds: string[];
  initialSelectedUnitIds: string[];
  initialSelectedDocIds: string[];
  onConfirm: (payload: {
    grade: number;
    subject: string;
    series: string;
    lessonIds: string[];
    unitIds: string[];
    documentIds: string[];
  }) => void;
}

const TriStateCheckbox: React.FC<{
  state: 'none' | 'partial' | 'all';
  onChange: () => void;
  ariaLabel: string;
}> = ({ state, onChange, ariaLabel }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'partial';
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={state === 'all'}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-5 w-5 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer shrink-0"
    />
  );
};

export const SourceSelectorModal: React.FC<SourceSelectorModalProps> = ({
  isOpen,
  onClose,
  lessons,
  documents,
  initialGrade,
  initialSubject,
  initialSelectedLessonIds,
  initialSelectedUnitIds,
  initialSelectedDocIds,
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'sgk' | 'my_docs'>('sgk');
  const [series, setSeries] = useState(TEXTBOOK_SERIES[0]);
  const [grade, setGrade] = useState(initialGrade);
  const [subject, setSubject] = useState(initialSubject);
  const [volumeFilter, setVolumeFilter] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(
    () => new Set(initialSelectedLessonIds)
  );
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    () => new Set(initialSelectedUnitIds)
  );
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(
    () => new Set(initialSelectedDocIds)
  );

  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(
    () => new Set(['Tập một', 'Tập hai', 'Sách một tập', 'Chuyên đề học tập'])
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<'browse' | 'preview'>('browse');

  useEffect(() => {
    if (isOpen) {
      setGrade(initialGrade);
      setSubject(initialSubject);
      setSelectedLessonIds(new Set(initialSelectedLessonIds));
      setSelectedUnitIds(new Set(initialSelectedUnitIds));
      setSelectedDocIds(new Set(initialSelectedDocIds));
    }
  }, [isOpen, initialGrade, initialSubject, initialSelectedLessonIds, initialSelectedUnitIds, initialSelectedDocIds]);

  const availableSubjects = useMemo(() => getSubjectsForGrade(grade), [grade]);

  useEffect(() => {
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects, subject]);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lessons.filter((l) => {
      if (l.series !== series) return false;
      if (l.grade !== grade) return false;
      if (l.subject !== subject) return false;
      if (volumeFilter !== 'Tất cả' && l.volume !== volumeFilter) return false;
      if (!q) return true;
      const haystack = [
        l.lessonNumber,
        l.lessonTitle,
        l.chapterTitle,
        l.summary,
        ...l.concepts,
        ...l.terms,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lessons, series, grade, subject, volumeFilter, searchQuery]);

  const tree = useMemo(() => {
    const volMap = new Map<string, Map<string, TextbookLesson[]>>();
    for (const l of filteredLessons) {
      if (!volMap.has(l.volume)) volMap.set(l.volume, new Map());
      const chapMap = volMap.get(l.volume)!;
      if (!chapMap.has(l.chapterTitle)) chapMap.set(l.chapterTitle, []);
      chapMap.get(l.chapterTitle)!.push(l);
    }
    return volMap;
  }, [filteredLessons]);

  useEffect(() => {
    if (filteredLessons.length > 0 && (!previewLessonId || !lessons.some((l) => l.id === previewLessonId))) {
      setPreviewLessonId(filteredLessons[0].id);
      setExpandedChapters((prev) => new Set(prev).add(filteredLessons[0].chapterTitle));
    }
  }, [filteredLessons, previewLessonId, lessons]);

  const previewLesson = useMemo(
    () => lessons.find((l) => l.id === previewLessonId) || filteredLessons[0] || null,
    [lessons, previewLessonId, filteredLessons]
  );

  const previewDoc = useMemo(
    () => documents.find((d) => d.id === previewDocId) || documents[0] || null,
    [documents, previewDocId]
  );

  if (!isOpen) return null;

  const toggleLesson = (lesson: TextbookLesson) => {
    const nextLessons = new Set(selectedLessonIds);
    const nextUnits = new Set(selectedUnitIds);
    if (nextLessons.has(lesson.id)) {
      nextLessons.delete(lesson.id);
      lesson.knowledgeUnits.forEach((u) => nextUnits.delete(u.id));
    } else {
      nextLessons.add(lesson.id);
      lesson.knowledgeUnits.forEach((u) => nextUnits.add(u.id));
    }
    setSelectedLessonIds(nextLessons);
    setSelectedUnitIds(nextUnits);
    setPreviewLessonId(lesson.id);
  };

  const toggleUnit = (lesson: TextbookLesson, unitId: string) => {
    const nextUnits = new Set(selectedUnitIds);
    const nextLessons = new Set(selectedLessonIds);
    if (nextUnits.has(unitId)) {
      nextUnits.delete(unitId);
      const anyLeft = lesson.knowledgeUnits.some((u) => nextUnits.has(u.id));
      if (!anyLeft) nextLessons.delete(lesson.id);
    } else {
      nextUnits.add(unitId);
      nextLessons.add(lesson.id);
    }
    setSelectedUnitIds(nextUnits);
    setSelectedLessonIds(nextLessons);
    setPreviewLessonId(lesson.id);
  };

  const toggleLessonGroup = (groupLessons: TextbookLesson[]) => {
    const allSelected = groupLessons.every((l) => selectedLessonIds.has(l.id));
    const nextLessons = new Set(selectedLessonIds);
    const nextUnits = new Set(selectedUnitIds);
    for (const l of groupLessons) {
      if (allSelected) {
        nextLessons.delete(l.id);
        l.knowledgeUnits.forEach((u) => nextUnits.delete(u.id));
      } else {
        nextLessons.add(l.id);
        l.knowledgeUnits.forEach((u) => nextUnits.add(u.id));
      }
    }
    setSelectedLessonIds(nextLessons);
    setSelectedUnitIds(nextUnits);
  };

  const getGroupState = (groupLessons: TextbookLesson[]): 'none' | 'partial' | 'all' => {
    if (groupLessons.length === 0) return 'none';
    const selectedCount = groupLessons.filter((l) => selectedLessonIds.has(l.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === groupLessons.length) return 'all';
    return 'partial';
  };

  const getLessonState = (lesson: TextbookLesson): 'none' | 'partial' | 'all' => {
    if (!selectedLessonIds.has(lesson.id)) return 'none';
    if (lesson.knowledgeUnits.length === 0) return 'all';
    const count = lesson.knowledgeUnits.filter((u) => selectedUnitIds.has(u.id)).length;
    if (count === 0) return 'none';
    if (count === lesson.knowledgeUnits.length) return 'all';
    return 'partial';
  };

  const totalUnitsInFilter = filteredLessons.reduce(
    (sum, l) => sum + Math.max(1, l.knowledgeUnits.length),
    0
  );
  const selectedUnitsCount = selectedUnitIds.size;

  const clearAllSelections = () => {
    setSelectedLessonIds(new Set());
    setSelectedUnitIds(new Set());
    setSelectedDocIds(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 md:p-6">
      <div className="animate-fade-slide-up flex flex-col w-full max-w-7xl h-[92vh] rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-4 bg-[#F5F7FB]">
          <div>
            <h2 className="text-[20px] font-bold text-[#0F172A] tracking-tight">
              CHỌN TÀI LIỆU LÀM NGUỒN
            </h2>
            <p className="text-[15px] text-[#475569] mt-0.5">
              Chọn các bài trong phạm vi kiểm tra để trợ lý AI bám sát kiến thức, thuật ngữ và kí hiệu của những bài đã chọn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#475569] hover:bg-slate-200/70 hover:text-[#0F172A] cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs & Filters */}
        <div className="border-b border-[#E2E8F0] px-6 py-3.5 space-y-3 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('sgk')}
                className={`px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors cursor-pointer ${
                  activeTab === 'sgk'
                    ? 'bg-white text-[#2563EB] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Sách giáo khoa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my_docs')}
                className={`px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors cursor-pointer ${
                  activeTab === 'my_docs'
                    ? 'bg-white text-[#2563EB] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Kho của tôi ({documents.length})
              </button>
            </div>

            {/* Mobile view switch */}
            <div className="flex md:hidden rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMobileStep('browse')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  mobileStep === 'browse' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#475569]'
                }`}
              >
                1. Chọn bài
              </button>
              <button
                type="button"
                onClick={() => setMobileStep('preview')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  mobileStep === 'preview' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#475569]'
                }`}
              >
                2. Xem nội dung
              </button>
            </div>
          </div>

          {activeTab === 'sgk' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <select
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-base text-[#0F172A]"
              >
                {TEXTBOOK_SERIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-base text-[#0F172A]"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Lớp {g}
                  </option>
                ))}
              </select>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-base text-[#0F172A]"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    Môn {sub}
                  </option>
                ))}
              </select>

              <select
                value={volumeFilter}
                onChange={(e) => setVolumeFilter(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-base text-[#0F172A]"
              >
                <option value="Tất cả">Tất cả tập sách</option>
                <option value="Tập một">Tập một</option>
                <option value="Tập hai">Tập hai</option>
                <option value="Sách một tập">Sách một tập</option>
                <option value="Chuyên đề học tập">Chuyên đề học tập</option>
              </select>

              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học hoặc khái niệm..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-3 py-2 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main 2-column split */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          {/* Left Tree */}
          <div
            className={`md:col-span-5 border-r border-[#E2E8F0] overflow-y-auto p-4 bg-[#F5F7FB] ${
              mobileStep === 'preview' ? 'hidden md:block' : 'block'
            }`}
          >
            {activeTab === 'sgk' ? (
              filteredLessons.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-center text-base text-[#475569] space-y-2.5">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-[#0F172A]">
                    Chưa có dữ liệu SGK được xác minh cho {subject} lớp {grade} ({series}).
                  </p>
                  <p className="text-[15px]">
                    Giáo viên có thể chuyển sang tab <strong>Kho của tôi</strong> để chọn tài liệu đã tải lên, hoặc vào phân hệ <strong>Kho kiến thức SGK</strong> để nhập/xác minh dữ liệu bài học.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-[#475569] pb-1">
                    <span>
                      Tìm thấy {filteredLessons.length} bài · {totalUnitsInFilter} mục kiến thức
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLessonGroup(filteredLessons)}
                      className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
                    >
                      {getGroupState(filteredLessons) === 'all' ? 'Bỏ chọn kết quả lọc' : 'Chọn tất cả kết quả lọc'}
                    </button>
                  </div>

                  {Array.from(tree.entries()).map(([volumeName, chapMap]) => {
                    const volLessons = Array.from(chapMap.values()).flat();
                    const volOpen = expandedVolumes.has(volumeName);
                    return (
                      <div key={volumeName} className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
                        <div
                          onClick={() => {
                            const next = new Set(expandedVolumes);
                            volOpen ? next.delete(volumeName) : next.add(volumeName);
                            setExpandedVolumes(next);
                          }}
                          className="flex items-center gap-2.5 px-3.5 min-h-[46px] cursor-pointer hover:bg-slate-50"
                        >
                          {volOpen ? (
                            <ChevronDown className="w-5 h-5 text-[#475569] shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[#475569] shrink-0" />
                          )}
                          <TriStateCheckbox
                            state={getGroupState(volLessons)}
                            onChange={() => toggleLessonGroup(volLessons)}
                            ariaLabel={`Chọn ${volumeName}`}
                          />
                          <span className="font-bold text-base text-[#0F172A] flex-1">
                            {volumeName}
                          </span>
                          <span className="text-sm text-[#475569] tabular-nums">
                            {volLessons.filter((l) => selectedLessonIds.has(l.id)).length}/{volLessons.length} bài
                          </span>
                        </div>

                        {volOpen && (
                          <div className="border-t border-slate-100 pl-3 pr-2 py-2 space-y-1.5">
                            {Array.from(chapMap.entries()).map(([chapterTitle, chapLessons]) => {
                              const chapOpen = expandedChapters.has(chapterTitle) || true;
                              return (
                                <div key={chapterTitle} className="space-y-1">
                                  <div
                                    onClick={() => {
                                      const next = new Set(expandedChapters);
                                      expandedChapters.has(chapterTitle)
                                        ? next.delete(chapterTitle)
                                        : next.add(chapterTitle);
                                      setExpandedChapters(next);
                                    }}
                                    className="flex items-center gap-2.5 px-2.5 min-h-[42px] rounded-lg hover:bg-slate-50 cursor-pointer"
                                  >
                                    <TriStateCheckbox
                                      state={getGroupState(chapLessons)}
                                      onChange={() => toggleLessonGroup(chapLessons)}
                                      ariaLabel={`Chọn ${chapterTitle}`}
                                    />
                                    <span className="text-base font-semibold text-[#0F172A] flex-1">
                                      {chapterTitle}
                                    </span>
                                  </div>

                                  {chapOpen && (
                                    <div className="pl-5 space-y-1">
                                      {chapLessons.map((lesson) => {
                                        const isViewing = previewLesson?.id === lesson.id;
                                        const lessonOpen = expandedLessons.has(lesson.id);
                                        return (
                                          <div
                                            key={lesson.id}
                                            className={`rounded-xl border transition-colors ${
                                              isViewing
                                                ? 'border-[#2563EB]/50 bg-[#EFF6FF]'
                                                : 'border-transparent hover:bg-slate-50'
                                            }`}
                                          >
                                            <div
                                              onClick={() => {
                                                setPreviewLessonId(lesson.id);
                                                setMobileStep('preview');
                                              }}
                                              className="flex items-start gap-2.5 px-2.5 py-2.5 min-h-[44px] cursor-pointer"
                                            >
                                              <div className="mt-0.5">
                                                <TriStateCheckbox
                                                  state={getLessonState(lesson)}
                                                  onChange={() => toggleLesson(lesson)}
                                                  ariaLabel={`Chọn ${lesson.lessonTitle}`}
                                                />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="text-base font-medium text-[#0F172A]">
                                                  {lesson.lessonNumber}. {lesson.lessonTitle}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-[#475569] mt-0.5">
                                                  {lesson.pageStart && (
                                                    <span>
                                                      Tr. {lesson.pageStart}–{lesson.pageEnd}
                                                    </span>
                                                  )}
                                                  <span>·</span>
                                                  <span
                                                    className={
                                                      lesson.verificationStatus === 'verified'
                                                        ? 'text-[#16A34A] font-medium'
                                                        : 'text-[#D97706] font-medium'
                                                    }
                                                  >
                                                    {lesson.verificationStatus === 'verified'
                                                      ? 'Đã xác minh'
                                                      : 'Chưa xác minh'}
                                                  </span>
                                                </div>
                                              </div>
                                              {lesson.knowledgeUnits.length > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const next = new Set(expandedLessons);
                                                    lessonOpen
                                                      ? next.delete(lesson.id)
                                                      : next.add(lesson.id);
                                                    setExpandedLessons(next);
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-[#0F172A]"
                                                  title="Xem mục kiến thức"
                                                >
                                                  {lessonOpen ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                  )}
                                                </button>
                                              )}
                                            </div>

                                            {lessonOpen && (
                                              <div className="pl-8 pr-2 pb-2.5 space-y-1.5">
                                                {lesson.knowledgeUnits.map((unit) => (
                                                  <label
                                                    key={unit.id}
                                                    className="flex items-start gap-2.5 text-[15px] text-[#334155] cursor-pointer py-1"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={selectedUnitIds.has(unit.id)}
                                                      onChange={() => toggleUnit(lesson, unit.id)}
                                                      className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB]"
                                                    />
                                                    <span>{unit.title}</span>
                                                  </label>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-center text-base text-[#475569] space-y-2.5">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-[#0F172A]">Kho tài liệu cá nhân đang trống.</p>
                <p className="text-[15px]">
                  Giáo viên có thể tải lên DOCX, PDF, XLSX, TXT hoặc ảnh trong phân hệ <strong>Kho kiến thức SGK → Kho của tôi</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const checked = selectedDocIds.has(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setPreviewDocId(doc.id);
                        setMobileStep('preview');
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer ${
                        previewDoc?.id === doc.id
                          ? 'border-[#2563EB]/50 bg-[#EFF6FF]'
                          : 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedDocIds);
                          checked ? next.delete(doc.id) : next.add(doc.id);
                          setSelectedDocIds(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-5 w-5 rounded border-[#CBD5E1] text-[#2563EB]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-[#0F172A] truncate">
                          {doc.title}
                        </div>
                        <div className="text-sm text-[#475569]">
                          {doc.fileType.toUpperCase()} · {Math.round(doc.fileSizeBytes / 1024)} KB
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Preview Pane */}
          <div
            className={`md:col-span-7 overflow-y-auto p-6 bg-white ${
              mobileStep === 'browse' ? 'hidden md:block' : 'block'
            }`}
          >
            {activeTab === 'sgk' ? (
              previewLesson ? (
                <div key={previewLesson.id} className="animate-fade-slide-up space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <div className="text-sm text-[#475569]">
                        {previewLesson.bookTitle} · Lớp {previewLesson.grade} · Môn {previewLesson.subject} · {previewLesson.volume}
                      </div>
                      <h3 className="text-[20px] font-bold text-[#0F172A] mt-1">
                        {previewLesson.lessonNumber}. {previewLesson.lessonTitle}
                      </h3>
                      <div className="text-[15px] text-[#475569] mt-1">
                        {previewLesson.chapterTitle}
                        {previewLesson.pageStart && ` · Trang ${previewLesson.pageStart} – ${previewLesson.pageEnd}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[15px] font-semibold">
                      {previewLesson.verificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
                          <CheckCircle2 className="w-5 h-5" />
                          Đã xác minh
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#D97706]">
                          <ShieldAlert className="w-5 h-5" />
                          Chưa xác minh
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide mb-1.5">
                      Tóm tắt nội dung
                    </h4>
                    <p className="text-base text-[#334155] leading-[1.65]">
                      <MathText text={previewLesson.summary} />
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide mb-1.5">
                      Kiến thức trọng tâm
                    </h4>
                    <ul className="list-disc pl-6 space-y-1.5 text-base text-[#334155] leading-[1.65]">
                      {previewLesson.coreKnowledge.map((k, i) => (
                        <li key={i}>
                          <MathText text={k} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide mb-1.5">
                      Yêu cầu cần đạt
                    </h4>
                    <ul className="list-disc pl-6 space-y-1.5 text-base text-[#334155] leading-[1.65]">
                      {previewLesson.learningOutcomes.map((o, i) => (
                        <li key={i}>
                          <MathText text={o} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {previewLesson.formulas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide mb-1.5">
                        Công thức và kí hiệu liên quan
                      </h4>
                      <div className="flex flex-wrap gap-3.5 rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4">
                        {previewLesson.formulas.map((f, i) => (
                          <span key={i} className="text-base text-[#0F172A]">
                            <MathText text={`$${f}$`} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4 space-y-1.5 text-[15px] text-[#334155]">
                    <div>
                      <strong className="text-[#0F172A]">Phạm vi kiến thức được phép ra đề:</strong>{' '}
                      <MathText text={previewLesson.scopeLimits} />
                    </div>
                    <div>
                      <strong className="text-[#0F172A]">Nguồn tham chiếu:</strong> {previewLesson.referenceSource}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-base text-[#475569]">
                  Chọn một bài học ở danh sách bên trái để xem chi tiết nội dung và yêu cầu cần đạt.
                </div>
              )
            ) : previewDoc ? (
              <div className="animate-fade-slide-up space-y-4">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h3 className="text-[20px] font-bold text-[#0F172A]">{previewDoc.title}</h3>
                  <div className="text-sm text-[#475569] mt-1">
                    Tệp: {previewDoc.fileName} · Định dạng: {previewDoc.fileType.toUpperCase()}
                  </div>
                </div>
                {previewDoc.warningNote && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[15px] text-amber-900">
                    {previewDoc.warningNote}
                  </div>
                )}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4 text-[15px] text-[#334155] whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                  {previewDoc.extractedText || 'Chưa có văn bản trích xuất.'}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-base text-[#475569]">
                Chọn một tài liệu cá nhân ở cột bên trái để xem trước nội dung.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F5F7FB] px-6 py-3.5">
          <div className="text-[15px] text-[#0F172A] tabular-nums">
            Đã chọn: <strong>{selectedLessonIds.size}</strong> bài học ·{' '}
            <strong>{selectedUnitsCount}</strong> mục kiến thức ·{' '}
            <strong>{selectedDocIds.size}</strong> tài liệu cá nhân
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={clearAllSelections}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-100 cursor-pointer"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm({
                  grade,
                  subject,
                  series,
                  lessonIds: Array.from(selectedLessonIds),
                  unitIds: Array.from(selectedUnitIds),
                  documentIds: Array.from(selectedDocIds),
                });
                onClose();
              }}
              className="rounded-xl bg-[#2563EB] px-5 py-2 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
            >
              Dùng các bài đã chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
