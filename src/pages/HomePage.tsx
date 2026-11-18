import React from 'react';
import {
  Archive,
  ArrowRight,
  BookOpen,
  Database,
  FileInput,
  FilePlus2,
  FileText,
  FolderOpen,
  Grid3X3,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import {
  AppModuleId,
  ExamDocument,
  ExamQuestion,
  MotionLevel,
  TextbookLesson,
  UserDocument,
} from '../types';
import { HomeBannerSlider } from '../components/HomeBannerSlider';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface HomePageProps {
  exams: ExamDocument[];
  questionBank: ExamQuestion[];
  lessons: TextbookLesson[];
  documents: UserDocument[];
  motionLevel: MotionLevel;
  onNavigate: (module: AppModuleId) => void;
  onStartAiExam: () => void;
  onStartManualExam: () => void;
  onOpenSourceSelector: () => void;
  onOpenExam: (examId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  exams,
  questionBank,
  lessons,
  documents,
  motionLevel,
  onNavigate,
  onStartAiExam,
  onStartManualExam,
  onOpenSourceSelector,
  onOpenExam,
}) => {
  const activeExams = exams.filter((e) => !e.isDeleted);
  const draftExams = activeExams
    .filter((e) => e.status === 'draft')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const recentExams = activeExams
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const verifiedLessonsCount = lessons.filter((l) => l.verificationStatus === 'verified').length;

  const quickActions = [
    {
      label: 'Tạo đề bằng AI',
      desc: 'Soạn đề tự động bám sát bài SGK',
      icon: Sparkles,
      onClick: onStartAiExam,
      featured: true,
    },
    {
      label: 'Soạn đề thủ công',
      desc: 'Trình soạn thảo trực quan khổ A4',
      icon: FilePlus2,
      onClick: onStartManualExam,
    },
    {
      label: 'Chọn bài SGK',
      desc: 'Kho Kết nối tri thức lớp 1–12',
      icon: BookOpen,
      onClick: onOpenSourceSelector,
    },
    {
      label: 'Tạo ma trận và bảng đặc tả',
      desc: 'Đồng bộ câu hỏi theo mức độ',
      icon: Grid3X3,
      onClick: () => onNavigate('matrix'),
    },
    {
      label: 'Nhập đề từ Word/PDF',
      desc: 'Tách câu hỏi & chuẩn hóa nhanh',
      icon: FileInput,
      onClick: () => onNavigate('tools'),
    },
    {
      label: 'Ngân hàng câu hỏi',
      desc: 'Lưu trữ và lọc theo bài học',
      icon: Database,
      onClick: () => onNavigate('bank'),
    },
    {
      label: 'Trộn đề kiểm tra',
      desc: 'Sinh nhiều mã đề 101–104',
      icon: Shuffle,
      onClick: () => onNavigate('shuffler'),
    },
    {
      label: 'Mở kho đề của tôi',
      desc: 'Quản lý đề đã lưu & bản sao',
      icon: FolderOpen,
      onClick: () => onNavigate('vault'),
    },
  ];

  const stats = [
    {
      label: 'Bài SGK đã xác minh',
      value: verifiedLessonsCount,
      unit: 'bài học',
      icon: BookOpen,
      iconBg: 'bg-blue-50 text-[#2563EB]',
      onClick: () => onNavigate('textbooks'),
    },
    {
      label: 'Đề kiểm tra trong kho',
      value: activeExams.length,
      unit: 'đề kiểm tra',
      icon: Archive,
      iconBg: 'bg-sky-50 text-[#0EA5E9]',
      onClick: () => onNavigate('vault'),
    },
    {
      label: 'Câu hỏi trong ngân hàng',
      value: questionBank.length,
      unit: 'câu hỏi',
      icon: Database,
      iconBg: 'bg-emerald-50 text-[#16A34A]',
      onClick: () => onNavigate('bank'),
    },
    {
      label: 'Tài liệu cá nhân',
      value: documents.length,
      unit: 'tệp nguồn',
      icon: FileText,
      iconBg: 'bg-amber-50 text-[#D97706]',
      onClick: () => onNavigate('textbooks'),
    },
  ];

  const nineSteps = [
    'Chọn loại đề kiểm tra (15 phút, 45 phút, giữa kì, cuối kì, tốt nghiệp THPT...).',
    'Chọn khối lớp và môn học phù hợp chương trình GDPT 2018.',
    'Chọn bài học trực tiếp từ SGK (Kết nối tri thức) hoặc tải tài liệu cá nhân.',
    'Thiết lập số câu hỏi, thời gian làm bài và thang điểm chuẩn.',
    'Tạo ma trận và bảng đặc tả nếu cần đồng bộ tỉ lệ nhận thức.',
    'Nhập yêu cầu tiếng Việt tự nhiên cho trợ lý AI hoặc tự thêm câu hỏi.',
    'Chỉnh sửa trực tiếp trên khổ giấy A4 và kiểm tra chất lượng đề.',
    'Trộn nhiều mã đề 101, 102, 103, 104 kèm phiếu trả lời trắc nghiệm.',
    'Xuất Word (DOCX + công thức OMML), PDF và bảng đáp án chi tiết.',
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 space-y-8">
      {/* 1. Banner Slider (4 dynamic slides + subtle floating motifs) */}
      <HomeBannerSlider
        motionLevel={motionLevel}
        onStartAiExam={onStartAiExam}
        onOpenSourceSelector={onOpenSourceSelector}
        onNavigate={onNavigate}
      />

      {/* 2. Quick Access Actions (8 cards grid) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[19px] sm:text-[20px] font-bold text-[#0F172A]">Truy cập nhanh</h2>
          <span className="text-sm text-[#475569] hidden sm:inline">
            Chọn một tác vụ để bắt đầu soạn đề ngay
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                type="button"
                onClick={act.onClick}
                className={`group flex items-center justify-between gap-3.5 rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] cursor-pointer ${
                  act.featured
                    ? 'border-[#2563EB]/30 bg-gradient-to-br from-[#EFF6FF] to-white hover:border-[#2563EB]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/50'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      act.featured
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-[#DBEAFE]/60 text-[#2563EB]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-[#0F172A] leading-snug">
                      {act.label}
                    </div>
                    <div className="text-sm text-[#475569] mt-0.5 line-clamp-1">{act.desc}</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#2563EB]" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Real Animated Counter Statistics */}
      <section className="space-y-3.5">
        <h2 className="text-[19px] sm:text-[20px] font-bold text-[#0F172A]">
          Thống kê dữ liệu hiện có
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.label}
                type="button"
                onClick={st.onClick}
                className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 text-left transition-all duration-200 hover:border-[#2563EB]/50 hover:shadow-sm cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${st.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[24px] sm:text-[26px] font-bold text-[#0F172A] leading-tight">
                    <AnimatedCounter value={st.value} motionLevel={motionLevel} />{' '}
                    <span className="text-sm font-medium text-[#475569]">{st.unit}</span>
                  </div>
                  <div className="text-sm font-medium text-[#475569] mt-0.5">{st.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4, 5, 6, 7. Workspace Activity & 9-Step Beginner Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Drafts & Recent Exams */}
        <div className="lg:col-span-7 space-y-6">
          {/* Drafts */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-bold text-[#0F172A]">Đề đang soạn</h2>
              <button
                type="button"
                onClick={() => onNavigate('vault')}
                className="text-[15px] font-semibold text-[#2563EB] hover:text-[#1E40AF] hover:underline cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>

            {draftExams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50/70 p-6 text-center text-base text-[#475569]">
                Chưa có bản nháp nào. Bấm <strong>Tạo đề bằng AI</strong> hoặc{' '}
                <strong>Soạn đề thủ công</strong> để bắt đầu.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {draftExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-[#0F172A] truncate">
                        {ex.title}
                      </div>
                      <div className="text-sm text-[#475569] mt-0.5 tabular-nums">
                        {ex.subject} Lớp {ex.grade} · {ex.questions.length} câu ·{' '}
                        {ex.durationMinutes} phút
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenExam(ex.id)}
                      className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-semibold text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Tiếp tục soạn
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Exams */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-bold text-[#0F172A]">Đề kiểm tra gần đây</h2>
              <button
                type="button"
                onClick={() => onNavigate('vault')}
                className="text-[15px] font-semibold text-[#2563EB] hover:text-[#1E40AF] hover:underline cursor-pointer"
              >
                Mở kho đề
              </button>
            </div>

            {recentExams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50/70 p-6 text-center text-base text-[#475569]">
                Kho đề kiểm tra hiện chưa có đề nào được lưu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#475569]">
                      <th className="py-3 pr-3 font-semibold">Tên đề</th>
                      <th className="py-3 pr-3 font-semibold">Môn / Lớp</th>
                      <th className="py-3 pr-3 font-semibold text-right">Số câu</th>
                      <th className="py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentExams.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 pr-3 font-semibold text-[#0F172A]">{ex.title}</td>
                        <td className="py-3.5 pr-3 text-[#475569]">
                          {ex.subject} · Lớp {ex.grade}
                        </td>
                        <td className="py-3.5 pr-3 text-right tabular-nums text-[#0F172A]">
                          {ex.questions.length}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenExam(ex.id)}
                            className="text-[#2563EB] font-semibold hover:text-[#1E40AF] hover:underline cursor-pointer"
                          >
                            Mở đề
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Columns: Sources Summary & 9-Step Beginner Timeline Guide */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-bold text-[#0F172A]">
                Ngân hàng & Nguồn tài liệu
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('bank')}
                className="text-[15px] font-semibold text-[#2563EB] hover:text-[#1E40AF] hover:underline cursor-pointer"
              >
                Quản lý câu hỏi
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => onNavigate('bank')}
                className="rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#2563EB] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <Database className="w-5 h-5 text-[#2563EB] mb-2" />
                <div className="text-base font-bold text-[#0F172A] tabular-nums">
                  {questionBank.length} câu hỏi
                </div>
                <div className="text-sm text-[#475569] mt-0.5">Trong ngân hàng cá nhân</div>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('textbooks')}
                className="rounded-xl border border-[#E2E8F0] p-4 text-left hover:border-[#2563EB] hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-[#2563EB] mb-2" />
                <div className="text-base font-bold text-[#0F172A] tabular-nums">
                  {verifiedLessonsCount} bài SGK · {documents.length} tệp
                </div>
                <div className="text-sm text-[#475569] mt-0.5">Nguồn đã xác minh & tải lên</div>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-bold text-[#0F172A]">
                Hướng dẫn dành cho người mới
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('guide')}
                className="text-[15px] font-semibold text-[#2563EB] hover:text-[#1E40AF] hover:underline cursor-pointer"
              >
                Xem chi tiết
              </button>
            </div>
            <ol className="space-y-3 guide-copy text-[#0F172A]">
              {nineSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="leading-[1.7] text-[#334155]">
                    <strong className="text-[#0F172A]">Bước {index + 1}:</strong> {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};
