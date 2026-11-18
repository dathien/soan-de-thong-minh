import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileOutput,
  Grid3X3,
  Pause,
  Play,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { AppModuleId, MotionLevel } from '../types';

interface HomeBannerSliderProps {
  motionLevel: MotionLevel;
  onStartAiExam: () => void;
  onOpenSourceSelector: () => void;
  onNavigate: (module: AppModuleId) => void;
}

interface BannerSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryCta: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void };
  secondaryCta: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void };
  accentGradient: string;
  motif: 'ai' | 'textbook' | 'matrix' | 'export';
}

export const HomeBannerSlider: React.FC<HomeBannerSliderProps> = ({
  motionLevel,
  onStartAiExam,
  onOpenSourceSelector,
  onNavigate,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slides: BannerSlide[] = [
    {
      id: 'slide-ai',
      tag: 'Sát kiến thức · Chuẩn cấu trúc · Tiết kiệm thời gian',
      title: 'SOẠN ĐỀ THÔNG MINH AI',
      description:
        'Hỗ trợ giáo viên phổ thông xây dựng đề kiểm tra bám sát sách giáo khoa, chuẩn cấu trúc GDPT 2018 và xuất bản nhanh chóng.',
      image: '/src/assets/images/hero_exam_studio_1794968659122.jpg',
      imageAlt: 'Không gian làm việc soạn đề kiểm tra của giáo viên',
      primaryCta: { label: 'Tạo đề bằng AI', icon: Sparkles, onClick: onStartAiExam },
      secondaryCta: { label: 'Chọn bài từ SGK', icon: BookOpen, onClick: onOpenSourceSelector },
      accentGradient: 'from-[#EFF6FF] via-white to-[#F0F9FF]',
      motif: 'ai',
    },
    {
      id: 'slide-sgk',
      tag: 'Kết nối tri thức với cuộc sống · Lớp 1 – Lớp 12',
      title: 'KHO KIẾN THỨC SÁCH GIÁO KHOA',
      description:
        'Chọn trực tiếp từng bài học và mục kiến thức đã xác minh làm nguồn chuẩn, giúp đề kiểm tra đúng thuật ngữ, kí hiệu và yêu cầu cần đạt.',
      image: '/src/assets/images/textbook_archive_cover_1794968660040.jpg',
      imageAlt: 'Kho sách giáo khoa Kết nối tri thức với cuộc sống',
      primaryCta: { label: 'Mở kho SGK', icon: BookOpen, onClick: () => onNavigate('textbooks') },
      secondaryCta: { label: 'Chọn bài nguồn', icon: CheckSquare, onClick: onOpenSourceSelector },
      accentGradient: 'from-[#F0F9FF] via-white to-[#EFF6FF]',
      motif: 'textbook',
    },
    {
      id: 'slide-matrix',
      tag: 'Đồng bộ hai chiều · Nhận biết – Thông hiểu – Vận dụng',
      title: 'MA TRẬN VÀ BẢNG ĐẶC TẢ CHUẨN CẤU TRÚC',
      description:
        'Tự động lập ma trận, sinh bảng đặc tả chi tiết theo từng đơn vị kiến thức và đối soát khớp số câu, tỉ lệ điểm với đề kiểm tra.',
      image: '/src/assets/images/banner_matrix_spec_1794971158217.jpg',
      imageAlt: 'Ma trận đề kiểm tra và bảng đặc tả khoa học',
      primaryCta: { label: 'Tạo ma trận đề', icon: Grid3X3, onClick: () => onNavigate('matrix') },
      secondaryCta: { label: 'Mở bảng đặc tả', icon: FileOutput, onClick: () => onNavigate('specification') },
      accentGradient: 'from-[#EFF6FF] via-white to-[#F8FAFC]',
      motif: 'matrix',
    },
    {
      id: 'slide-export',
      tag: 'Khổ A4 Times New Roman 13pt · Công thức OMML',
      title: 'SOẠN THẢO, TRỘN ĐỀ VÀ XUẤT WORD/PDF',
      description:
        'Chỉnh sửa trực quan trên khổ giấy A4, sinh nhiều mã đề 101–104 kèm phiếu trả lời OMR và xuất file Word chuẩn công thức.',
      image: '/src/assets/images/banner_exam_export_1794971158623.jpg',
      imageAlt: 'Trộn nhiều mã đề và xuất đề kiểm tra Word PDF',
      primaryCta: { label: 'Trộn mã đề', icon: Shuffle, onClick: () => onNavigate('shuffler') },
      secondaryCta: { label: 'Mở trình soạn thảo', icon: Sparkles, onClick: onStartAiExam },
      accentGradient: 'from-[#F0F9FF] via-white to-[#EFF6FF]',
      motif: 'export',
    },
  ];

  useEffect(() => {
    const onVisChange = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  useEffect(() => {
    if (paused || hovered || tabHidden || motionLevel === 'off') return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [paused, hovered, tabHidden, motionLevel, slides.length]);

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % slides.length);

  const slide = slides[activeIndex];
  const PrimaryIcon = slide.primaryCta.icon;
  const SecondaryIcon = slide.secondaryCta.icon;

  return (
    <section
      aria-label="Giới thiệu tính năng nổi bật"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (Math.abs(dx) > 45) {
          dx < 0 ? goNext() : goPrev();
        }
        touchStartX.current = null;
      }}
      className={`no-print relative rounded-2xl border border-[#E2E8F0] bg-gradient-to-br ${slide.accentGradient} shadow-sm overflow-hidden transition-colors duration-500`}
    >
      {/* Subtle non-overlapping corner floating decorative motifs */}
      {motionLevel !== 'off' && (
        <div
          aria-hidden="true"
          className="pointer-events-none hidden xl:block absolute inset-0 overflow-hidden"
        >
          <div className="animate-float-gentle absolute top-4 right-[44%] rounded-xl border border-blue-200/70 bg-white/85 px-3 py-1.5 text-sm font-semibold text-[#1E40AF] shadow-sm backdrop-blur-xs">
            ∫ f(x)dx · Δ = b² - 4ac
          </div>
          <div className="animate-float-tilt absolute bottom-5 right-[42%] rounded-xl border border-sky-200/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-[#0284C7] shadow-sm backdrop-blur-xs">
            Chuẩn GDPT 2018
          </div>
        </div>
      )}

      {/* Main Slide Grid */}
      <div
        key={slide.id}
        className="animate-fade-slide-up grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[280px] lg:h-[330px]"
      >
        {/* Left Content Column */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:px-10 lg:py-7 flex flex-col justify-between gap-4 relative z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2563EB]" />
              <span>{slide.tag}</span>
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight tracking-tight">
              {slide.title}
            </h1>
            <p className="text-base text-[#475569] max-w-2xl leading-relaxed">
              {slide.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={slide.primaryCta.onClick}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 min-h-[46px] text-base font-semibold text-white shadow-sm hover:bg-[#1E40AF] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PrimaryIcon className="w-5 h-5" />
                {slide.primaryCta.label}
              </button>
              <button
                type="button"
                onClick={slide.secondaryCta.onClick}
                className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 py-3 min-h-[46px] text-base font-medium text-[#0F172A] hover:bg-slate-50 hover:border-[#2563EB]/50 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SecondaryIcon className="w-5 h-5 text-[#2563EB]" />
                {slide.secondaryCta.label}
              </button>
            </div>

            {/* Slider Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#2563EB]/40 transition-colors cursor-pointer"
                aria-label="Banner trước"
                title="Banner trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 px-1.5" role="tablist" aria-label="Chọn banner">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeIndex}
                    aria-label={`Chuyển đến ${s.title}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeIndex
                        ? 'w-7 bg-[#2563EB]'
                        : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#2563EB]/40 transition-colors cursor-pointer"
                aria-label="Banner tiếp theo"
                title="Banner tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:border-[#2563EB]/40 transition-colors cursor-pointer"
                aria-label={paused ? 'Tiếp tục tự động chuyển' : 'Tạm dừng chuyển banner'}
                title={paused ? 'Tiếp tục tự động chuyển' : 'Tạm dừng'}
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Image Column */}
        <div className="lg:col-span-5 relative h-52 sm:h-64 lg:h-full bg-slate-100 overflow-hidden">
          <img
            src={slide.image}
            alt={slide.imageAlt}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700"
          />
          <div
            aria-hidden="true"
            className="hidden lg:block absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/75 to-transparent"
          />
        </div>
      </div>
    </section>
  );
};
