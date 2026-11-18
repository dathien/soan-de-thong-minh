import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  HelpCircle,
  Monitor,
  RotateCcw,
  Shield,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react';
import { AppSettings, MotionLevel, UiFontSize } from '../types';
import { exportFullBackup, importFullBackup } from '../services/indexedDb';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useToast } from '../components/ToastProvider';

export const GuidePage: React.FC = () => {
  const modules = [
    {
      title: '1. Quy trình 9 bước soạn đề chuẩn GDPT 2018',
      purpose: 'Giúp giáo viên làm chủ toàn bộ quy trình từ chọn nguồn SGK đến xuất Word/PDF.',
      steps: [
        'Bước 1–2: Chọn loại đề kiểm tra (15 phút, 45 phút, giữa kì, cuối kì, tốt nghiệp THPT) và Khối lớp, Môn học.',
        'Bước 3: Bấm "Chọn bài từ SGK" để chọn đúng bài học thuộc bộ Kết nối tri thức với cuộc sống.',
        'Bước 4–5: Thiết lập thời gian, thang điểm hoặc lập Ma trận & Bảng đặc tả.',
        'Bước 6: Nhập yêu cầu tự nhiên cho Trợ lý AI hoặc thêm câu hỏi thủ công.',
        'Bước 7–9: Chỉnh sửa trực tiếp trên khổ A4, kiểm tra chất lượng, trộn mã đề và xuất Word (DOCX + công thức OMML) hoặc PDF.',
      ],
      example:
        'Ví dụ: "Tạo đề kiểm tra 15 phút môn Toán 10, gồm 10 câu trắc nghiệm, bám sát bài Mệnh đề."',
      trouble:
        'Nếu AI báo chưa đủ nguồn xác minh: hãy mở mục Chọn bài SGK và tích chọn ít nhất 1 bài học có nhãn Đã xác minh.',
    },
    {
      title: '2. Công thức Toán học & Hình vẽ khoa học',
      purpose:
        'Soạn thảo công thức chuẩn Toán - Lí - Hóa và đồ thị chính xác không cần thuộc mã LaTeX.',
      steps: [
        'Trong màn hình Soạn đề kiểm tra, mở tab Công thức hoặc Hình khoa học ở cột bên phải.',
        'Nhấp vào các nút mẫu trực quan (Phân số, Căn thức, Tích phân, Vectơ, Phương trình hóa học...).',
        'Với đồ thị hàm số, nhập đúng biểu thức y = f(x) (ví dụ x^2 - 2*x - 1) để vẽ đồ thị chính xác theo tọa độ.',
      ],
      example:
        'Nhấp trực tiếp vào một công thức đã có trên trang đề A4 để mở nhanh trình chỉnh sửa công thức.',
      trouble:
        'Nếu xuất Word bị lỗi hiển thị: hãy dùng nút "Xuất Word" tích hợp sẵn để chuyển đổi công thức sang định dạng OMML chuẩn của Microsoft Word.',
    },
    {
      title: '3. Trộn mã đề & Phiếu trả lời trắc nghiệm',
      purpose: 'Sinh nhiều mã đề tương đương và bảng đáp án đối chiếu nhanh chóng.',
      steps: [
        'Khóa các câu hỏi không muốn thay đổi vị trí bằng biểu tượng ổ khóa trên từng câu.',
        'Vào mục Trộn đề, chọn số mã đề (ví dụ 4 mã: 101, 102, 103, 104) và bấm Tạo mã đề.',
        'Tải trọn bộ file Word các mã đề kèm file Excel bảng đáp án trong một gói ZIP duy nhất.',
      ],
      example:
        'Các phương án như "Tất cả các phương án trên" luôn được tự động giữ cố định vị trí cuối.',
      trouble:
        'Kiểm tra lại bảng ánh xạ Câu mới ↔ Câu gốc sau khi trộn nếu đề có nhóm câu dùng chung hình ảnh.',
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 text-[#2563EB] font-semibold text-sm mb-2">
          <HelpCircle className="w-5 h-5" />
          TÀI LIỆU HƯỚNG DẪN SỬ DỤNG
        </div>
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight">
          Hướng dẫn sử dụng SOẠN ĐỀ THÔNG MINH AI
        </h1>
        <p className="text-base text-[#475569] mt-2 leading-relaxed">
          Thiết kế trực quan, cỡ chữ rõ ràng dành cho giáo viên phổ thông từ Tiểu học đến THPT.
        </p>
      </div>

      <div className="space-y-5">
        {modules.map((m) => (
          <section
            key={m.title}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 space-y-4 shadow-xs"
          >
            <h2 className="text-[19px] sm:text-[20px] font-bold text-[#0F172A]">{m.title}</h2>
            <p className="text-base text-[#334155] leading-[1.7]">
              <strong className="text-[#0F172A]">Mục đích:</strong> {m.purpose}
            </p>
            <div>
              <div className="text-sm font-bold text-[#1E40AF] uppercase tracking-wide mb-2">
                Các bước thao tác
              </div>
              <ul className="list-disc pl-6 space-y-2 text-base text-[#334155] leading-[1.7]">
                {m.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#F5F7FB] border border-[#E2E8F0] p-4 text-[15px] text-[#334155] space-y-2 leading-[1.7]">
              <div>
                <strong className="text-[#0F172A]">Ví dụ thực tế:</strong> {m.example}
              </div>
              <div>
                <strong className="text-[#0F172A]">Xử lý lỗi thường gặp:</strong> {m.trouble}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

interface SettingsPageProps {
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => Promise<void>;
  onAfterRestore: () => Promise<void>;
}

const FONT_SIZE_OPTIONS: { value: UiFontSize; label: string; desc: string }[] = [
  { value: 16, label: 'Tiêu chuẩn (16px)', desc: 'Cỡ chữ mặc định cân đối và rõ nét.' },
  { value: 18, label: 'Chữ lớn (18px)', desc: 'Dễ đọc hơn trên màn hình lớn hoặc trình chiếu.' },
  { value: 20, label: 'Chữ rất lớn (20px)', desc: 'Phù hợp khi cần chữ thật to, giảm mỏi mắt.' },
];

const MOTION_OPTIONS: { value: MotionLevel; label: string; desc: string }[] = [
  { value: 'off', label: 'Tắt hiệu ứng', desc: 'Hiển thị tức thì, không chuyển động.' },
  { value: 'gentle', label: 'Nhẹ nhàng', desc: 'Mượt mà, tinh tế và dễ chịu (Khuyên dùng).' },
  { value: 'lively', label: 'Sinh động', desc: 'Nhấn mạnh chuyển tiếp giao diện rõ hơn.' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onAfterRestore,
}) => {
  const toast = useToast();
  const [form, setForm] = useState<AppSettings>(settings);
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Apply preview immediately when user toggles font size or motion
  const updateDisplayPref = async (patch: Partial<Pick<AppSettings, 'uiFontSize' | 'motionLevel'>>) => {
    const updated: AppSettings = { ...form, ...patch };
    setForm(updated);
    await onSaveSettings(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(form);
    setSavedNotice('Đã lưu cấu hình vào bộ nhớ cục bộ IndexedDB.');
    window.setTimeout(() => setSavedNotice(''), 3500);
  };

  const handleExportBackup = async () => {
    const payload = await exportFullBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sao_luu_soan_de_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống tệp sao lưu JSON toàn bộ dữ liệu.');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importFullBackup(json);
      await onAfterRestore();
      setSavedNotice('Đã khôi phục toàn bộ dữ liệu từ bản sao lưu JSON.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khôi phục bản sao lưu.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">
            Cài đặt hệ thống & Hiển thị
          </h1>
          <p className="text-base text-[#475569] mt-1">
            Tùy chỉnh cỡ chữ giao diện, hiệu ứng chuyển động, thông tin đầu đề và sao lưu dữ liệu IndexedDB.
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {savedNotice && (
        <div className="rounded-xl border border-[#16A34A]/30 bg-emerald-50 px-5 py-3.5 text-base text-emerald-900 flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Display & Motion Settings */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-6 h-6 text-[#2563EB]" />
            <div>
              <h2 className="text-[19px] font-bold text-[#0F172A]">Giao diện và hiển thị</h2>
              <p className="text-sm text-[#475569]">
                Áp dụng ngay cho toàn bộ menu, nút bấm và bảng dữ liệu (không ảnh hưởng khổ giấy in A4 13pt).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateDisplayPref({ uiFontSize: 16, motionLevel: 'gentle' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#475569]" />
            Đặt lại mặc định
          </button>
        </div>

        {/* Font Size Selector */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-base font-semibold text-[#0F172A]">
            <Type className="w-5 h-5 text-[#2563EB]" />
            Cỡ chữ giao diện toàn ứng dụng
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {FONT_SIZE_OPTIONS.map((opt) => {
              const selected = (form.uiFontSize || 16) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateDisplayPref({ uiFontSize: opt.value })}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-[#0F172A]">{opt.label}</span>
                    {selected && (
                      <span className="text-sm font-semibold text-[#2563EB]">Đang dùng</span>
                    )}
                  </div>
                  <p className="text-sm text-[#475569] mt-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Live Preview Box */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[#2563EB]">Xem trước hiển thị thực tế</div>
              <div className="text-base text-[#0F172A]">
                Đây là cỡ chữ giao diện đang áp dụng ({form.uiFontSize || 16}px) — rõ ràng, thoáng và dễ đọc.
              </div>
            </div>
            <span className="rounded-xl bg-[#2563EB] px-4 py-2 text-[15px] font-semibold text-white">
              Nút mẫu
            </span>
          </div>
        </div>

        {/* Motion Level Selector */}
        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
          <label className="flex items-center gap-2 text-base font-semibold text-[#0F172A]">
            <Sparkles className="w-5 h-5 text-[#2563EB]" />
            Mức độ hiệu ứng chuyển động
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {MOTION_OPTIONS.map((opt) => {
              const selected = (form.motionLevel || 'gentle') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateDisplayPref({ motionLevel: opt.value })}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-[#0F172A]">{opt.label}</span>
                    {selected && (
                      <span className="text-sm font-semibold text-[#2563EB]">Đang dùng</span>
                    )}
                  </div>
                  <p className="text-sm text-[#475569] mt-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Teacher & Header Info Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 shadow-xs"
      >
        <h2 className="text-[19px] font-bold text-[#0F172A]">
          Thông tin giáo viên & Đầu đề mặc định
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Tên giáo viên
            </label>
            <input
              type="text"
              value={form.teacherName}
              onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">Năm học</label>
            <input
              type="text"
              value={form.schoolYear}
              onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Sở / Phòng GD&ĐT
            </label>
            <input
              type="text"
              value={form.departmentName}
              onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Đơn vị / Trường
            </label>
            <input
              type="text"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Tổ chuyên môn
            </label>
            <input
              type="text"
              value={form.subjectGroup}
              onChange={(e) => setForm({ ...form, subjectGroup: e.target.value })}
              className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
              Chế độ giao diện làm việc
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'teacher' | 'admin' })}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="teacher">Giáo viên (Soạn đề & Học liệu cá nhân)</option>
              <option value="admin">Quản trị viên học liệu (Duyệt nguồn SGK cục bộ)</option>
            </select>
          </div>
        </div>

        <label className="inline-flex items-center gap-3 cursor-pointer text-base text-[#0F172A]">
          <input
            type="checkbox"
            checked={form.showBeginnerTips}
            onChange={(e) => setForm({ ...form, showBeginnerTips: e.target.checked })}
            className="w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB]"
          />
          <span>Hiển thị gợi ý hướng dẫn tại chỗ khi mới bắt đầu</span>
        </label>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-xl bg-[#2563EB] px-6 py-2.5 min-h-[44px] text-base font-semibold text-white hover:bg-[#1E40AF] transition-colors cursor-pointer"
          >
            Lưu cài đặt
          </button>
        </div>
      </form>

      {/* Backup & Sync */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
        <h2 className="text-[19px] font-bold text-[#0F172A]">
          Sao lưu & Khôi phục dữ liệu cục bộ (IndexedDB)
        </h2>
        <p className="text-base text-[#475569] leading-relaxed">
          Toàn bộ đề kiểm tra, ngân hàng câu hỏi, ma trận, bảng đặc tả và kho SGK đang được lưu ngoại tuyến an toàn trên trình duyệt qua IndexedDB.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 min-h-[44px] text-base font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Xuất bản sao lưu JSON
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 py-2.5 min-h-[44px] text-base font-semibold text-[#0F172A] hover:bg-slate-50 cursor-pointer">
            <Upload className="w-5 h-5 text-[#2563EB]" />
            Nhập & Khôi phục từ JSON
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#475569] mt-0.5 shrink-0" />
          <div className="text-[15px] text-[#475569] leading-relaxed">
            <strong className="text-[#0F172A]">Trạng thái đồng bộ đám mây (Firebase Auth & Firestore):</strong>{' '}
            Hiện ứng dụng đang chạy ở chế độ lưu trữ cục bộ ngoại tuyến IndexedDB. Khi triển khai lên môi trường có cấu hình dự án Firebase (Google / Email), tính năng đồng bộ đa thiết bị sẽ kích hoạt mà không ghi đè dữ liệu mới bằng phiên bản cũ.
          </div>
        </div>
      </div>
    </div>
  );
};
