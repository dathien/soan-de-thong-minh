import React, { useState } from 'react';
import { MathText } from './MathText';
import { Copy, Check, Plus } from 'lucide-react';

interface FormulaTemplate {
  label: string;
  latex: string;
}

const FORMULA_GROUPS: { title: string; items: FormulaTemplate[] }[] = [
  {
    title: 'Đại số & Giải tích',
    items: [
      { label: 'Phân số', latex: '\\frac{a}{b}' },
      { label: 'Căn bậc hai', latex: '\\sqrt{x}' },
      { label: 'Căn bậc n', latex: '\\sqrt[n]{x}' },
      { label: 'Lũy thừa', latex: 'x^{n}' },
      { label: 'Chỉ số dưới', latex: 'x_{1}' },
      { label: 'Trị tuyệt đối', latex: '|x|' },
      { label: 'Logarit', latex: '\\log_{a} b' },
      { label: 'Logarit tự nhiên', latex: '\\ln x' },
      { label: 'Giới hạn', latex: '\\lim_{x \\to x_0} f(x)' },
      { label: 'Đạo hàm', latex: "f'(x)" },
      { label: 'Nguyên hàm', latex: '\\int f(x)\\,dx' },
      { label: 'Tích phân', latex: '\\int_{a}^{b} f(x)\\,dx' },
      { label: 'Tổng Sigma', latex: '\\sum_{i=1}^{n} a_i' },
      { label: 'Tích Pi', latex: '\\prod_{i=1}^{n} a_i' },
      { label: 'Ma trận 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'Hệ phương trình', latex: '\\begin{cases} ax + by = c \\\\ a\'x + b\'y = c\' \\end{cases}' },
    ],
  },
  {
    title: 'Lượng giác, Hình học & Vectơ',
    items: [
      { label: 'sin x', latex: '\\sin \\alpha' },
      { label: 'cos x', latex: '\\cos \\alpha' },
      { label: 'tan x', latex: '\\tan \\alpha' },
      { label: 'cot x', latex: '\\cot \\alpha' },
      { label: 'Vectơ AB', latex: '\\overrightarrow{AB}' },
      { label: 'Vectơ a', latex: '\\vec{a}' },
      { label: 'Góc ABC', latex: '\\widehat{ABC}' },
      { label: 'Độ (°)', latex: '90^\\circ' },
      { label: 'Gạch ngang trên', latex: '\\overline{P}' },
      { label: 'Vuông góc', latex: '\\perp' },
      { label: 'Song song', latex: '\\parallel' },
      { label: 'Tam giác', latex: '\\triangle ABC' },
    ],
  },
  {
    title: 'Tập hợp & Logic',
    items: [
      { label: 'Thuộc', latex: '\\in' },
      { label: 'Không thuộc', latex: '\\notin' },
      { label: 'Tập con', latex: '\\subset' },
      { label: 'Giao', latex: '\\cap' },
      { label: 'Hợp', latex: '\\cup' },
      { label: 'Hiệu', latex: '\\setminus' },
      { label: 'Tập rỗng', latex: '\\varnothing' },
      { label: 'Với mọi', latex: '\\forall x \\in \\mathbb{R}' },
      { label: 'Tồn tại', latex: '\\exists x \\in \\mathbb{R}' },
      { label: 'Kéo theo', latex: 'P \\Rightarrow Q' },
      { label: 'Tương đương', latex: 'P \\Leftrightarrow Q' },
      { label: 'Vô cực', latex: '+\\infty' },
      { label: 'Nhỏ hơn hoặc bằng', latex: '\\le' },
      { label: 'Lớn hơn hoặc bằng', latex: '\\ge' },
      { label: 'Khác', latex: '\\ne' },
    ],
  },
  {
    title: 'Hóa học & Vật lí',
    items: [
      { label: 'Phản ứng 1 chiều', latex: '2H_2 + O_2 \\xrightarrow{t^\\circ} 2H_2O' },
      { label: 'Phản ứng thuận nghịch', latex: 'N_2 + 3H_2 \\rightleftharpoons 2NH_3' },
      { label: 'Phương trình ion', latex: 'H^+ + OH^- \\to H_2O' },
      { label: 'Ion đa nguyên tử', latex: 'SO_4^{2-}' },
      { label: 'Đồng vị hạt nhân', latex: '{}^{14}_{6}\\text{C}' },
      { label: 'Kết tủa / Bay hơi', latex: 'BaSO_4\\downarrow + H_2\\uparrow' },
      { label: 'Tần số góc', latex: '\\omega = \\frac{2\\pi}{T}' },
      { label: 'Đơn vị tốc độ', latex: '\\text{m/s}^2' },
    ],
  },
];

interface FormulaBuilderProps {
  initialLatex?: string;
  onInsertFormula: (wrappedLatex: string) => void;
  defaultSubject?: string;
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  initialLatex = '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}',
  onInsertFormula,
  defaultSubject,
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [displayMode, setDisplayMode] = useState(false);
  const [showRawLatex, setShowRawLatex] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeDefaultGroup =
    defaultSubject === 'Hóa học' || defaultSubject === 'Vật lí' ? 3 : 0;
  const [activeGroupIdx, setActiveGroupIdx] = useState(activeDefaultGroup);

  const appendTemplate = (tpl: string) => {
    setLatex((prev) => (prev ? `${prev} ${tpl}` : tpl));
  };

  const handleCopy = async () => {
    const wrapped = displayMode ? `$$${latex}$$` : `$${latex}$`;
    await navigator.clipboard.writeText(wrapped);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3.5 text-[15px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-base text-[#0F172A]">Trình soạn công thức trực quan</span>
        <button
          type="button"
          onClick={() => setShowRawLatex((v) => !v)}
          className="text-sm text-[#2563EB] hover:underline font-semibold cursor-pointer"
        >
          {showRawLatex ? 'Ẩn mã LaTeX' : 'Hiện mã LaTeX'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
        {FORMULA_GROUPS.map((g, idx) => (
          <button
            key={g.title}
            type="button"
            onClick={() => setActiveGroupIdx(idx)}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeGroupIdx === idx
                ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      {/* Clickable visual symbol palette */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1.5 border border-[#E2E8F0] rounded-xl bg-white">
        {FORMULA_GROUPS[activeGroupIdx].items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => appendTemplate(item.latex)}
            title={item.label}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] px-2 py-2 hover:border-[#2563EB] hover:bg-blue-50/60 transition-colors text-center cursor-pointer"
          >
            <span className="text-[#0F172A] text-base">
              <MathText text={`$${item.latex}$`} />
            </span>
            <span className="text-sm text-[#475569] truncate w-full">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Live Preview */}
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F7FB] p-3.5 min-h-16 flex items-center justify-center">
        {latex.trim() ? (
          <div className="text-lg text-[#0F172A] overflow-x-auto max-w-full">
            <MathText text={displayMode ? `$$${latex}$$` : `$${latex}$`} />
          </div>
        ) : (
          <span className="text-sm text-[#475569]">Chọn mẫu công thức ở trên để xem trước</span>
        )}
      </div>

      {/* Optional raw LaTeX textarea */}
      {showRawLatex && (
        <div>
          <label className="block text-sm font-medium text-[#475569] mb-1">
            Chỉnh sửa biểu thức (LaTeX tùy chọn)
          </label>
          <textarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 font-mono text-[14px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            placeholder="Ví dụ: \frac{a}{b} + \sqrt{x}"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="inline-flex items-center gap-2 text-[15px] text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={displayMode}
            onChange={(e) => setDisplayMode(e.target.checked)}
            className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB]"
          />
          Hiển thị riêng dòng ($$)
        </label>
        <button
          type="button"
          onClick={() => setLatex('')}
          className="text-sm font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
        >
          Xóa trắng
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!latex.trim()}
          onClick={() => onInsertFormula(displayMode ? `$$${latex.trim()}$$` : `$${latex.trim()}$`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2.5 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Chèn vào câu hỏi
        </button>
        <button
          type="button"
          disabled={!latex.trim()}
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 min-h-[42px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Đã chép' : 'Chép'}
        </button>
      </div>
    </div>
  );
};
