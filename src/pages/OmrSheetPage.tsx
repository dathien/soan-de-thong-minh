import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Printer } from 'lucide-react';
import { ExamDocument } from '../types';

interface OmrSheetPageProps {
  activeExam: ExamDocument;
}

type SheetPreset = '20' | '30' | '40' | '50' | '60' | '100' | 'thpt2025' | 'custom';

export const OmrSheetPage: React.FC<OmrSheetPageProps> = ({ activeExam }) => {
  const [preset, setPreset] = useState<SheetPreset>('thpt2025');
  const [customCount, setCustomCount] = useState(25);
  const [paperMode, setPaperMode] = useState<'a4_single' | 'a5_double'>('a4_single');
  const [tfCount, setTfCount] = useState(4);
  const [shortCount, setShortCount] = useState(6);

  const mcqCount =
    preset === 'thpt2025'
      ? 18
      : preset === 'custom'
        ? Math.max(1, Math.min(120, customCount))
        : Number(preset);

  const handleExportAnswerCsv = () => {
    const sorted = activeExam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const rows = sorted.map((q, idx) => ({
      Cau: idx + 1,
      MaDe: activeExam.header.examCode,
      DapAn: q.correctAnswer,
      Diem: q.points,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Dap_An_Ma_${activeExam.header.examCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAnswerExcel = () => {
    const sorted = activeExam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const rows = sorted.map((q, idx) => ({
      Câu: idx + 1,
      'Mã đề': activeExam.header.examCode,
      'Đáp án': q.correctAnswer,
      Điểm: q.points,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DapAn');
    XLSX.writeFile(wb, `Bang_Dap_An_Ma_${activeExam.header.examCode}.xlsx`);
  };

  const renderOmrCard = (compact: boolean) => {
    const cols = mcqCount <= 20 ? 2 : mcqCount <= 45 ? 3 : 4;
    const perCol = Math.ceil(mcqCount / cols);
    const colIndices = Array.from({ length: cols }, (_, c) => c);

    return (
      <div
        className={`relative border-2 border-slate-900 bg-white text-slate-900 ${
          compact ? 'p-3 text-[10px]' : 'p-6 text-xs'
        }`}
      >
        {/* 4 Corner Fiducial Alignment Squares */}
        <span className="absolute top-1.5 left-1.5 w-3 h-3 bg-black" />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-black" />
        <span className="absolute bottom-1.5 left-1.5 w-3 h-3 bg-black" />
        <span className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-black" />

        <div className="text-center font-bold uppercase tracking-wide border-b border-slate-300 pb-2 mb-3">
          PHIẾU TRẢ LỜI TRẮC NGHIỆM
          <div className="font-normal normal-case text-slate-600 mt-0.5">
            {activeExam.header.schoolName} · Môn: {activeExam.subject} (Lớp {activeExam.grade})
          </div>
        </div>

        {/* Student Info + SBD & Exam Code Bubbles */}
        <div className="grid grid-cols-12 gap-3 mb-3 pb-2 border-b border-slate-300">
          <div className="col-span-6 space-y-1.5">
            <div>Họ và tên: ....................................................</div>
            <div>Lớp: ................... Ngày thi: ....../....../202...</div>
            <div className="rounded border border-slate-300 bg-slate-50 p-1.5 text-[10px] text-slate-600">
              Hướng dẫn: Dùng bút chì đen tô kín ô tròn tương ứng với phương án chọn. Không tẩy xóa làm rách phiếu.
            </div>
          </div>

          <div className="col-span-4 border border-slate-400 p-1.5">
            <div className="text-center font-semibold mb-1">SỐ BÁO DANH</div>
            <div className="grid grid-cols-6 gap-0.5 text-center font-mono-tabular text-[9px]">
              {Array.from({ length: 6 }, (_, c) => (
                <div key={c} className="space-y-0.5">
                  <div className="border-b border-slate-400 h-4" />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <div
                      key={d}
                      className="mx-auto w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 border border-slate-400 p-1.5">
            <div className="text-center font-semibold mb-1">MÃ ĐỀ</div>
            <div className="grid grid-cols-3 gap-0.5 text-center font-mono-tabular text-[9px]">
              {Array.from({ length: 3 }, (_, c) => (
                <div key={c} className="space-y-0.5">
                  <div className="border-b border-slate-400 h-4" />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <div
                      key={d}
                      className="mx-auto w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Part I: MCQ Bubbles */}
        <div className="mb-3">
          <div className="font-bold mb-1.5">
            PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN ({mcqCount} câu)
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {colIndices.map((cIdx) => {
              const start = cIdx * perCol + 1;
              const end = Math.min(mcqCount, (cIdx + 1) * perCol);
              if (start > mcqCount) return null;
              return (
                <div key={cIdx} className="border border-slate-300 p-1.5 space-y-1">
                  {Array.from({ length: end - start + 1 }, (_, i) => {
                    const qNum = start + i;
                    return (
                      <div key={qNum} className="flex items-center justify-between gap-1 font-mono-tabular">
                        <span className="w-6 font-semibold text-right pr-1">{qNum}.</span>
                        {['A', 'B', 'C', 'D'].map((opt) => (
                          <span
                            key={opt}
                            className="w-4 h-4 rounded-full border border-slate-700 inline-flex items-center justify-center text-[9px]"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Part II & Part III for 2025 THPT */}
        {preset === 'thpt2025' && (
          <div className="grid grid-cols-12 gap-3 pt-1">
            <div className="col-span-6 border border-slate-300 p-2">
              <div className="font-bold mb-1.5">PHẦN II. ĐÚNG / SAI</div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: tfCount }, (_, idx) => (
                  <div key={idx} className="border border-slate-200 p-1 space-y-0.5">
                    <div className="font-semibold">Câu {idx + 1}</div>
                    {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                      <div key={sub} className="flex items-center justify-between text-[10px]">
                        <span>{sub})</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-flex items-center justify-center text-[8px]">
                            Đ
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-flex items-center justify-center text-[8px]">
                            S
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-6 border border-slate-300 p-2">
              <div className="font-bold mb-1.5">PHẦN III. TRẢ LỜI NGẮN</div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: shortCount }, (_, idx) => (
                  <div key={idx} className="border border-slate-200 p-1">
                    <div className="font-semibold text-[10px]">Câu {idx + 1}</div>
                    <div className="grid grid-cols-4 gap-0.5 mt-1">
                      {[0, 1, 2, 3].map((cell) => (
                        <div key={cell} className="h-5 border border-slate-400" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="no-print rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">
              Phiếu trả lời trắc nghiệm & Bảng đáp án
            </h1>
            <p className="text-base text-[#475569] mt-1">
              Có các ô định vị 4 góc ổn định, hỗ trợ khổ A4 hoặc ghép 2 phiếu A5 trên 1 trang A4.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportAnswerCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[44px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#2563EB]" />
              Đáp án CSV
            </button>
            <button
              type="button"
              onClick={handleExportAnswerExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 min-h-[44px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#16A34A]" />
              Đáp án Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2 min-h-[44px] text-base font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              In / Xuất PDF Phiếu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">Mẫu phiếu</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as SheetPreset)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base"
            >
              <option value="thpt2025">Cấu trúc Tốt nghiệp THPT 2025 (TN + Đ/S + TLN)</option>
              <option value="20">Phiếu 20 câu trắc nghiệm</option>
              <option value="30">Phiếu 30 câu trắc nghiệm</option>
              <option value="40">Phiếu 40 câu trắc nghiệm</option>
              <option value="50">Phiếu 50 câu trắc nghiệm</option>
              <option value="60">Phiếu 60 câu trắc nghiệm</option>
              <option value="100">Phiếu 100 câu trắc nghiệm</option>
              <option value="custom">Tùy chỉnh số câu</option>
            </select>
          </div>

          {preset === 'custom' && (
            <div>
              <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
                Số câu trắc nghiệm
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={customCount}
                onChange={(e) => setCustomCount(Number(e.target.value) || 20)}
                className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base tabular-nums"
              />
            </div>
          )}

          {preset === 'thpt2025' && (
            <>
              <div>
                <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
                  Số câu Đúng/Sai (Phần II)
                </label>
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={tfCount}
                  onChange={(e) => setTfCount(Number(e.target.value) || 4)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[15px] font-medium text-[#475569] mb-1.5">
                  Số câu Trả lời ngắn (Phần III)
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={shortCount}
                  onChange={(e) => setShortCount(Number(e.target.value) || 6)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-base tabular-nums"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[15px] font-medium text-[#475569] mb-1.5">Khổ giấy in</label>
            <select
              value={paperMode}
              onChange={(e) => setPaperMode(e.target.value as 'a4_single' | 'a5_double')}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-base"
            >
              <option value="a4_single">1 phiếu chuẩn khổ A4</option>
              <option value="a5_double">Ghép 2 phiếu A5 trên 1 trang A4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Print Sheet Canvas */}
      <div className="print-only-container a4-sheet p-4 sm:p-8">
        {paperMode === 'a4_single' ? (
          renderOmrCard(false)
        ) : (
          <div className="space-y-4">
            {renderOmrCard(true)}
            <div className="border-t border-dashed border-slate-400 my-2" />
            {renderOmrCard(true)}
          </div>
        )}
      </div>
    </div>
  );
};
