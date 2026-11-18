import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { TextbookLesson, UserDocument, UserRole, VerificationStatus } from '../types';
import { GRADES, TEXTBOOK_SERIES, getSubjectsForGrade } from '../data/curriculum';
import { parseUploadedDocument } from '../services/documentParser';
import { MathText } from '../components/MathText';
import { useToast } from '../components/ToastProvider';

interface TextbookLibraryPageProps {
  role: UserRole;
  lessons: TextbookLesson[];
  documents: UserDocument[];
  onSaveLesson: (lesson: TextbookLesson) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onSaveDocument: (doc: UserDocument) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUseLessonInExam: (lesson: TextbookLesson) => void;
}

export const TextbookLibraryPage: React.FC<TextbookLibraryPageProps> = ({
  role,
  lessons,
  documents,
  onSaveLesson,
  onDeleteLesson,
  onSaveDocument,
  onDeleteDocument,
  onUseLessonInExam,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'sgk' | 'my_docs' | 'admin'>('sgk');
  const [series, setSeries] = useState(TEXTBOOK_SERIES[0]);
  const [grade, setGrade] = useState(10);
  const [subject, setSubject] = useState('Toán');
  const [search, setSearch] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessons[0]?.id || null);

  // My Docs upload state
  const [docCategory, setDocCategory] = useState<UserDocument['category']>('sgk');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Admin add lesson form
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonNumber, setNewLessonNumber] = useState('Bài 1');
  const [newChapterTitle, setNewChapterTitle] = useState('Chương I');
  const [newVolume, setNewVolume] = useState<TextbookLesson['volume']>('Tập một');
  const [newSummary, setNewSummary] = useState('');
  const [newOutcomes, setNewOutcomes] = useState('');
  const [newRefSource, setNewRefSource] = useState('');

  const availableSubjects = useMemo(() => getSubjectsForGrade(grade), [grade]);

  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lessons.filter((l) => {
      if (l.series !== series) return false;
      if (l.grade !== grade) return false;
      if (l.subject !== subject) return false;
      if (!q) return true;
      return `${l.lessonNumber} ${l.lessonTitle} ${l.chapterTitle} ${l.summary}`
        .toLowerCase()
        .includes(q);
    });
  }, [lessons, series, grade, subject, search]);

  const selectedLesson =
    lessons.find((l) => l.id === selectedLessonId) || filteredLessons[0] || null;

  const duplicatePairs = useMemo(() => {
    const seen = new Map<string, TextbookLesson[]>();
    for (const l of lessons) {
      const key = `${l.grade}-${l.subject}-${l.lessonTitle.trim().toLowerCase()}`;
      const list = seen.get(key) || [];
      list.push(l);
      seen.set(key, list);
    }
    return Array.from(seen.values()).filter((g) => g.length > 1);
  }, [lessons]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus('');
    try {
      const parsed = await parseUploadedDocument(file, docCategory, subject, grade);
      await onSaveDocument(parsed);
      setUploadStatus(`Đã tải lên và trích xuất thành công: ${parsed.title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải tệp lên.';
      setUploadStatus(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    const lesson: TextbookLesson = {
      id: `custom-${grade}-${Date.now()}`,
      series,
      grade,
      subject,
      bookTitle: `${subject} ${grade} - ${newVolume}`,
      editionYear: '2024',
      volume: newVolume,
      chapterNumber: 1,
      chapterTitle: newChapterTitle.trim() || 'Chương I',
      lessonNumber: newLessonNumber.trim() || 'Bài mới',
      lessonTitle: newLessonTitle.trim(),
      summary: newSummary.trim() || 'Chưa có tóm tắt.',
      coreKnowledge: newSummary.trim() ? [newSummary.trim()] : [],
      concepts: [],
      terms: [],
      formulas: [],
      scientificSymbols: [],
      theorems: [],
      learningOutcomes: newOutcomes
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      exerciseTypes: [],
      scopeLimits: 'Theo nội dung đã nhập và xác minh.',
      commonMistakes: [],
      referenceSource: newRefSource.trim() || 'Dữ liệu do giáo viên/quản trị viên nhập',
      verificationStatus: role === 'admin' ? 'verified' : 'unverified',
      originType: 'system_summary',
      knowledgeUnits: [
        {
          id: `u-${Date.now()}`,
          title: newLessonTitle.trim(),
          originType: 'system_summary',
          summary: newSummary.trim(),
          keyPoints: [],
          formulas: [],
          scientificSymbols: [],
          definitionsAndTheorems: [],
          learningOutcomes: newOutcomes
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          exerciseTypes: [],
          scopeLimits: 'Bám sát tài liệu nguồn đã đối chiếu.',
          commonMistakes: [],
        },
      ],
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    await onSaveLesson(lesson);
    setSelectedLessonId(lesson.id);
    setShowAddLesson(false);
    setNewLessonTitle('');
    setNewSummary('');
    setNewOutcomes('');
  };

  const handleImportLessonsJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Tệp JSON phải là một mảng các bài học.');
      for (const item of arr) {
        if (item.id && item.lessonTitle) {
          await onSaveLesson({
            ...item,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      toast.success(`Đã nhập ${arr.length} bài học vào kho kiến thức.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đọc tệp JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportLessonsJson = () => {
    const blob = new Blob([JSON.stringify(lessons, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kho_kien_thuc_sgk_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất sao lưu kho SGK (JSON).');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-xs">
        <div className="md:col-span-8 p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight">
              Kho Kiến Thức Sách Giáo Khoa & Tài Liệu Nguồn
            </h1>
            <p className="text-base text-[#475569] mt-1.5 leading-relaxed">
              Tổ chức chuẩn theo Bộ sách → Khối lớp → Môn học → Tập sách → Chương → Bài học → Mục kiến thức. Phân biệt rõ dữ liệu SGK đã xác minh và tài liệu tải lên cá nhân.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('sgk')}
              className={`rounded-xl px-4 py-2 min-h-[42px] text-[15px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'sgk'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
              }`}
            >
              Sách giáo khoa ({lessons.length} bài)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_docs')}
              className={`rounded-xl px-4 py-2 min-h-[42px] text-[15px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'my_docs'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
              }`}
            >
              Kho tài liệu của tôi ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`rounded-xl px-4 py-2 min-h-[42px] text-[15px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
              }`}
            >
              Quản trị & Nhập dữ liệu SGK
            </button>
          </div>
        </div>
        <div className="md:col-span-4 h-44 md:h-auto bg-slate-100">
          <img
            src="/src/assets/images/textbook_archive_cover_1794968660040.jpg"
            alt="Kho sách giáo khoa Kết nối tri thức với cuộc sống"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* TAB 1: SGK */}
      {activeTab === 'sgk' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
            <select
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base text-[#0F172A]"
            >
              {TEXTBOOK_SERIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={grade}
              onChange={(e) => {
                const g = Number(e.target.value);
                setGrade(g);
                const subs = getSubjectsForGrade(g);
                if (!subs.includes(subject)) setSubject(subs[0]);
              }}
              className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base text-[#0F172A]"
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
              className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base text-[#0F172A]"
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  Môn {s}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên bài hoặc khái niệm..."
                className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2.5">
              {filteredLessons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-7 text-center text-base text-[#475569] space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-[#0F172A]">
                    Chưa có bài học xác minh cho {subject} Lớp {grade}.
                  </p>
                  <p className="text-[15px]">
                    Bạn có thể nhập dữ liệu nguồn ở tab <strong>Quản trị & Nhập dữ liệu SGK</strong> hoặc tải tài liệu riêng ở tab <strong>Kho tài liệu của tôi</strong>.
                  </p>
                </div>
              ) : (
                filteredLessons.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLessonId(l.id)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                      selectedLesson?.id === l.id
                        ? 'border-[#2563EB] bg-[#EFF6FF] shadow-xs'
                        : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/40 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="font-semibold text-base text-[#0F172A]">
                        {l.lessonNumber}. {l.lessonTitle}
                      </div>
                      <span
                        className={`text-sm font-semibold shrink-0 ${
                          l.verificationStatus === 'verified'
                            ? 'text-[#16A34A]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        {l.verificationStatus === 'verified' ? 'Đã xác minh' : 'Chưa xác minh'}
                      </span>
                    </div>
                    <div className="text-sm text-[#475569] mt-1">
                      {l.volume} · {l.chapterTitle}
                      {l.pageStart && ` · Trang ${l.pageStart}–${l.pageEnd}`}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-7">
              {selectedLesson ? (
                <div
                  key={selectedLesson.id}
                  className="animate-fade-slide-up rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <div className="text-sm text-[#475569]">
                        {selectedLesson.bookTitle} · {selectedLesson.editionYear}
                      </div>
                      <h2 className="text-[22px] font-bold text-[#0F172A] mt-1">
                        {selectedLesson.lessonNumber}. {selectedLesson.lessonTitle}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUseLessonInExam(selectedLesson)}
                      className="rounded-xl bg-[#2563EB] px-4 py-2.5 min-h-[44px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
                    >
                      Dùng bài này để soạn đề
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide">
                      Tóm tắt
                    </h3>
                    <p className="text-base text-[#334155] leading-[1.65]">
                      <MathText text={selectedLesson.summary} />
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide">
                      Kiến thức trọng tâm
                    </h3>
                    <ul className="list-disc pl-6 text-base text-[#334155] space-y-1.5 leading-[1.65]">
                      {selectedLesson.coreKnowledge.map((k, idx) => (
                        <li key={idx}>
                          <MathText text={k} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide">
                      Yêu cầu cần đạt
                    </h3>
                    <ul className="list-disc pl-6 text-base text-[#334155] space-y-1.5 leading-[1.65]">
                      {selectedLesson.learningOutcomes.map((o, idx) => (
                        <li key={idx}>
                          <MathText text={o} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4 text-[15px] text-[#334155] space-y-1.5">
                    <div>
                      <strong className="text-[#0F172A]">Giới hạn kiến thức:</strong>{' '}
                      <MathText text={selectedLesson.scopeLimits} />
                    </div>
                    <div>
                      <strong className="text-[#0F172A]">Nguồn đối chiếu:</strong>{' '}
                      {selectedLesson.referenceSource}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center text-base text-[#475569]">
                  Chọn một bài học để xem chi tiết nội dung và yêu cầu cần đạt.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY DOCS */}
      {activeTab === 'my_docs' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4">
            <h2 className="text-[19px] font-bold text-[#0F172A]">
              Tải lên tài liệu cá nhân (DOCX, PDF, XLSX, TXT, JPG, PNG)
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as UserDocument['category'])}
                className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-base text-[#0F172A]"
              >
                <option value="sgk">SGK được phép sử dụng</option>
                <option value="sgv">Sách giáo viên</option>
                <option value="lesson_plan">Kế hoạch bài dạy</option>
                <option value="sample_exam">Đề kiểm tra mẫu</option>
                <option value="matrix">Ma trận đề</option>
                <option value="specification">Bảng đặc tả</option>
                <option value="review">Tài liệu ôn tập</option>
                <option value="question_bank">Ngân hàng câu hỏi</option>
                <option value="guidance">Hướng dẫn chuyên môn</option>
              </select>

              <label className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 min-h-[44px] text-base font-semibold text-white hover:bg-[#1E40AF] cursor-pointer">
                <Upload className="w-5 h-5" />
                {uploading ? 'Đang trích xuất nội dung...' : 'Chọn tệp từ máy tính'}
                <input
                  type="file"
                  accept=".docx,.pdf,.txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            {uploading && (
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-[#2563EB] animate-indeterminate" />
              </div>
            )}
            {uploadStatus && (
              <div className="text-[15px] text-[#1E40AF] bg-[#EFF6FF] border border-[#2563EB]/30 rounded-xl px-4 py-3">
                {uploadStatus}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {documents.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center text-base text-[#475569]">
                Chưa có tài liệu cá nhân nào. Tải lên tài liệu để sử dụng làm nguồn tham chiếu riêng khi soạn đề mà không ảnh hưởng kho dùng chung.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-base text-[#0F172A]">
                        <FileText className="w-5 h-5 text-[#2563EB] shrink-0" />
                        {doc.title}
                      </div>
                      <div className="text-sm text-[#475569] mt-1">
                        {doc.fileName} · {doc.fileType.toUpperCase()} · {Math.round(doc.fileSizeBytes / 1024)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="text-[#DC2626] hover:bg-rose-50 p-2 rounded-xl cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  {doc.warningNote && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {doc.warningNote}
                    </div>
                  )}
                  <div className="rounded-xl bg-[#F5F7FB] border border-[#E2E8F0] p-3.5 text-[15px] text-[#334155] max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {doc.extractedText || 'Không có văn bản trích xuất.'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN KNOWLEDGE MANAGER */}
      {activeTab === 'admin' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[19px] font-bold text-[#0F172A]">
                  Quản trị & Xác minh dữ liệu kho kiến thức SGK
                </h2>
                <p className="text-[15px] text-[#475569] mt-0.5">
                  Vai trò hiện tại: <strong className="text-[#0F172A]">{role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</strong>. Chỉ bài học ở trạng thái Đã xác minh mới được dùng trong chế độ ra đề bám sát nguồn SGK.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddLesson((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Thêm bài học mới
                </button>
                <label className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#2563EB]" />
                  Nhập hàng loạt (JSON)
                  <input type="file" accept=".json" onChange={handleImportLessonsJson} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleExportLessonsJson}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#2563EB]" />
                  Sao lưu kho SGK
                </button>
              </div>
            </div>

            {duplicatePairs.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[15px] text-amber-900 flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#D97706]" />
                Phát hiện {duplicatePairs.length} nhóm bài học có tên trùng lặp trong cùng khối lớp và môn học.
              </div>
            )}

            {showAddLesson && (
              <form
                onSubmit={handleCreateLesson}
                className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-5 space-y-3.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    placeholder="Tên chương/chủ đề"
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                  />
                  <input
                    type="text"
                    required
                    value={newLessonNumber}
                    onChange={(e) => setNewLessonNumber(e.target.value)}
                    placeholder="Số bài (VD: Bài 7)"
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                  />
                  <select
                    value={newVolume}
                    onChange={(e) => setNewVolume(e.target.value as TextbookLesson['volume'])}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                  >
                    <option value="Tập một">Tập một</option>
                    <option value="Tập hai">Tập hai</option>
                    <option value="Sách một tập">Sách một tập</option>
                    <option value="Chuyên đề học tập">Chuyên đề học tập</option>
                  </select>
                </div>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="Tên bài học"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                />
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Tóm tắt kiến thức trọng tâm..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                />
                <textarea
                  rows={2}
                  value={newOutcomes}
                  onChange={(e) => setNewOutcomes(e.target.value)}
                  placeholder="Yêu cầu cần đạt (mỗi dòng 1 yêu cầu)..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                />
                <input
                  type="text"
                  value={newRefSource}
                  onChange={(e) => setNewRefSource(e.target.value)}
                  placeholder="Nguồn tài liệu đối chiếu chính thức"
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-base"
                />
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddLesson(false)}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-[15px] font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#2563EB] px-5 py-2 text-[15px] text-white font-semibold hover:bg-[#1E40AF]"
                  >
                    Lưu bài học
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#475569]">
                    <th className="py-3 pr-3 font-semibold">Khối / Môn</th>
                    <th className="py-3 pr-3 font-semibold">Bài học</th>
                    <th className="py-3 pr-3 font-semibold">Trạng thái</th>
                    <th className="py-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3 text-[#475569]">
                        Lớp {l.grade} · {l.subject}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-[#0F172A]">
                        {l.lessonNumber}. {l.lessonTitle}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            l.verificationStatus === 'verified'
                              ? 'text-[#16A34A]'
                              : 'text-[#D97706]'
                          }`}
                        >
                          {l.verificationStatus === 'verified' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          {l.verificationStatus === 'verified' ? 'Đã xác minh' : 'Chưa xác minh'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-3 whitespace-nowrap">
                        {role === 'admin' && (
                          <button
                            type="button"
                            onClick={() =>
                              onSaveLesson({
                                ...l,
                                verificationStatus: (l.verificationStatus === 'verified'
                                  ? 'unverified'
                                  : 'verified') as VerificationStatus,
                                version: l.version + 1,
                                updatedAt: new Date().toISOString(),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[#2563EB] font-medium hover:underline cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            {l.verificationStatus === 'verified' ? 'Hủy duyệt' : 'Duyệt xác minh'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteLesson(l.id)}
                          className="text-[#DC2626] font-medium hover:underline cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
