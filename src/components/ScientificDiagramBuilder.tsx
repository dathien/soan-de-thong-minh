import React, { useMemo, useState } from 'react';
import { QuestionDiagram } from '../types';
import { Plus } from 'lucide-react';

interface ScientificDiagramBuilderProps {
  subject: string;
  onInsertDiagram: (diagram: QuestionDiagram) => void;
}

type DiagramKind = 'math' | 'physics' | 'chemistry';

function safeEvalMathFn(expr: string, x: number): number | null {
  try {
    const sanitized = expr
      .toLowerCase()
      .replace(/\^/g, '**')
      .replace(/(\d)(x)/g, '$1*$2')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\bln\b/g, 'Math.log');
    if (!/^[0-9x+\-*/().\sMathsincoqrtabpPIE]+$/.test(sanitized.replace(/Math\.\w+/g, 'x'))) {
      return null;
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `return (${sanitized});`);
    const y = fn(x);
    return typeof y === 'number' && Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

export const ScientificDiagramBuilder: React.FC<ScientificDiagramBuilderProps> = ({
  subject,
  onInsertDiagram,
}) => {
  const defaultTab: DiagramKind =
    subject === 'Vật lí' ? 'physics' : subject === 'Hóa học' ? 'chemistry' : 'math';

  const [tab, setTab] = useState<DiagramKind>(defaultTab);
  const [strokeColor, setStrokeColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#1d4ed8');
  const [width, setWidth] = useState(320);

  // Math presets
  const [mathMode, setMathMode] = useState<'graph' | 'triangle' | 'circle' | 'bbt' | 'pyramid'>('graph');
  const [fnExpr, setFnExpr] = useState('x^2 - 2*x - 1');
  const [triLabels, setTriLabels] = useState('A,B,C');
  const [triAngle, setTriAngle] = useState('60°');
  const [bbtHeader, setBbtHeader] = useState('-∞, -1, 1, +∞');
  const [bbtSign, setBbtSign] = useState('+, 0, -, 0, +');

  // Physics presets
  const [physMode, setPhysMode] = useState<'circuit' | 'inclined' | 'wave' | 'lens'>('circuit');
  const [physLabel1, setPhysLabel1] = useState('R₁');
  const [physLabel2, setPhysLabel2] = useState('R₂');
  const [inclinedAngle, setInclinedAngle] = useState('30°');

  // Chemistry presets
  const [chemMode, setChemMode] = useState<'flask' | 'gas_prep' | 'benzene'>('flask');
  const [chemLabel, setChemLabel] = useState('Dung dịch H₂SO₄');

  const height = Math.round(width * 0.65);

  const svgMarkup = useMemo(() => {
    const w = 320;
    const h = 208;

    if (tab === 'math') {
      if (mathMode === 'graph') {
        const cx = w / 2;
        const cy = h / 2;
        const scale = 24;
        const pts: string[] = [];
        let drawing = false;
        let pathD = '';
        for (let px = 16; px <= w - 16; px += 2) {
          const x = (px - cx) / scale;
          const y = safeEvalMathFn(fnExpr, x);
          if (y === null || Math.abs(y) > 4.2) {
            drawing = false;
            continue;
          }
          const py = cy - y * scale;
          pathD += `${drawing ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `;
          drawing = true;
          pts.push(`${px},${py}`);
        }

        const gridLines: string[] = [];
        for (let gx = -5; gx <= 5; gx++) {
          const xPos = cx + gx * scale;
          gridLines.push(`<line x1="${xPos}" y1="12" x2="${xPos}" y2="${h - 12}" stroke="#e2e8f0" stroke-width="1"/>`);
          if (gx !== 0) {
            gridLines.push(`<text x="${xPos - 3}" y="${cy + 13}" font-size="9" fill="#64748b" font-family="Times New Roman">${gx}</text>`);
          }
        }
        for (let gy = -3; gy <= 3; gy++) {
          const yPos = cy - gy * scale;
          gridLines.push(`<line x1="16" y1="${yPos}" x2="${w - 16}" y2="${yPos}" stroke="#e2e8f0" stroke-width="1"/>`);
          if (gy !== 0) {
            gridLines.push(`<text x="${cx + 5}" y="${yPos + 3}" font-size="9" fill="#64748b" font-family="Times New Roman">${gy}</text>`);
          }
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  ${gridLines.join('')}
  <line x1="12" y1="${cy}" x2="${w - 10}" y2="${cy}" stroke="${strokeColor}" stroke-width="1.4"/>
  <polygon points="${w - 10},${cy - 3} ${w - 3},${cy} ${w - 10},${cy + 3}" fill="${strokeColor}"/>
  <line x1="${cx}" y1="${h - 10}" x2="${cx}" y2="10" stroke="${strokeColor}" stroke-width="1.4"/>
  <polygon points="${cx - 3},12 ${cx},5 ${cx + 3},12" fill="${strokeColor}"/>
  <text x="${w - 14}" y="${cy - 6}" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">x</text>
  <text x="${cx + 6}" y="14" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">y</text>
  <text x="${cx - 10}" y="${cy + 12}" font-size="11" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">O</text>
  <path d="${pathD}" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;
      }

      if (mathMode === 'triangle') {
        const [lA = 'A', lB = 'B', lC = 'C'] = triLabels.split(',').map((s) => s.trim());
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <polygon points="145,28 56,176 268,176" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  <path d="M 78,176 A 22,22 0 0,0 67,157" fill="none" stroke="${accentColor}" stroke-width="1.6"/>
  <text x="141" y="20" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">${lA}</text>
  <text x="40" y="182" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">${lB}</text>
  <text x="274" y="182" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">${lC}</text>
  <text x="84" y="166" font-size="12" font-family="Times New Roman" fill="${accentColor}">${triAngle}</text>
</svg>`;
      }

      if (mathMode === 'circle') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <circle cx="150" cy="104" r="72" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  <circle cx="150" cy="104" r="2.5" fill="${strokeColor}"/>
  <line x1="150" y1="104" x2="212" y2="68" stroke="${accentColor}" stroke-width="1.6"/>
  <line x1="100" y1="156" x2="212" y2="68" stroke="${strokeColor}" stroke-width="1.4" stroke-dasharray="4,3"/>
  <text x="142" y="120" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">O</text>
  <text x="182" y="80" font-size="13" font-style="italic" font-family="Times New Roman" fill="${accentColor}">R</text>
  <text x="218" y="70" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">A</text>
  <text x="86" y="166" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">B</text>
</svg>`;
      }

      if (mathMode === 'bbt') {
        const xs = bbtHeader.split(',').map((s) => s.trim());
        const signs = bbtSign.split(',').map((s) => s.trim());
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="16" y="20" width="288" height="164" fill="none" stroke="${strokeColor}" stroke-width="1.4"/>
  <line x1="68" y1="20" x2="68" y2="184" stroke="${strokeColor}" stroke-width="1.2"/>
  <line x1="16" y1="54" x2="304" y2="54" stroke="${strokeColor}" stroke-width="1.2"/>
  <line x1="16" y1="90" x2="304" y2="90" stroke="${strokeColor}" stroke-width="1.2"/>
  <text x="38" y="42" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">x</text>
  <text x="34" y="77" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">y'</text>
  <text x="38" y="140" font-size="13" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">y</text>
  <text x="76" y="42" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${xs[0] || '-∞'}</text>
  <text x="138" y="42" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${xs[1] || 'x₁'}</text>
  <text x="212" y="42" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${xs[2] || 'x₂'}</text>
  <text x="276" y="42" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${xs[3] || '+∞'}</text>
  <text x="108" y="77" font-size="13" font-family="Times New Roman" fill="${accentColor}">${signs[0] || '+'}</text>
  <text x="142" y="77" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${signs[1] || '0'}</text>
  <text x="178" y="77" font-size="13" font-family="Times New Roman" fill="${accentColor}">${signs[2] || '-'}</text>
  <text x="216" y="77" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${signs[3] || '0'}</text>
  <text x="252" y="77" font-size="13" font-family="Times New Roman" fill="${accentColor}">${signs[4] || '+'}</text>
  <path d="M 88,166 L 138,112" stroke="${accentColor}" stroke-width="1.6" marker-end="url(#arr)"/>
  <path d="M 150,112 L 210,166" stroke="${accentColor}" stroke-width="1.6"/>
  <path d="M 222,166 L 280,112" stroke="${accentColor}" stroke-width="1.6"/>
</svg>`;
      }

      // pyramid
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <line x1="120" y1="26" x2="58" y2="156" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="120" y1="26" x2="158" y2="182" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="120" y1="26" x2="262" y2="148" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="58" y1="156" x2="158" y2="182" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="158" y1="182" x2="262" y2="148" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="58" y1="156" x2="262" y2="148" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="5,4"/>
  <line x1="120" y1="26" x2="120" y2="153" stroke="${accentColor}" stroke-width="1.4" stroke-dasharray="4,3"/>
  <text x="115" y="19" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">S</text>
  <text x="44" y="162" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">A</text>
  <text x="154" y="198" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">B</text>
  <text x="268" y="152" font-size="14" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">C</text>
  <text x="112" y="168" font-size="13" font-style="italic" font-family="Times New Roman" fill="${accentColor}">H</text>
</svg>`;
    }

    if (tab === 'physics') {
      if (physMode === 'circuit') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <polyline points="60,54 108,54" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
  <rect x="108" y="42" width="44" height="24" fill="#ffffff" stroke="${accentColor}" stroke-width="1.8"/>
  <text x="123" y="35" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${physLabel1}</text>
  <polyline points="152,54 184,54" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
  <rect x="184" y="42" width="44" height="24" fill="#ffffff" stroke="${accentColor}" stroke-width="1.8"/>
  <text x="199" y="35" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${physLabel2}</text>
  <polyline points="228,54 268,54 268,156 172,156" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
  <line x1="172" y1="140" x2="172" y2="172" stroke="${strokeColor}" stroke-width="2.2"/>
  <line x1="158" y1="148" x2="158" y2="164" stroke="${strokeColor}" stroke-width="3.2"/>
  <text x="156" y="190" font-size="12" font-family="Times New Roman" fill="${strokeColor}">E, r</text>
  <polyline points="158,156 60,156 60,54" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
  <circle cx="268" cy="105" r="14" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.6"/>
  <text x="263" y="109" font-size="12" font-weight="bold" font-family="Times New Roman" fill="${strokeColor}">A</text>
</svg>`;
      }

      if (physMode === 'inclined') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <polygon points="48,176 272,176 272,62" fill="#f8fafc" stroke="${strokeColor}" stroke-width="1.8"/>
  <g transform="translate(160,118) rotate(-27)">
    <rect x="-20" y="-22" width="40" height="22" fill="#dbeafe" stroke="${accentColor}" stroke-width="1.6"/>
    <line x1="0" y1="-11" x2="0" y2="-56" stroke="#16a34a" stroke-width="2"/>
    <text x="6" y="-48" font-size="12" font-style="italic" font-family="Times New Roman" fill="#16a34a">N</text>
  </g>
  <line x1="155" y1="108" x2="155" y2="170" stroke="#dc2626" stroke-width="2"/>
  <polygon points="151,164 155,174 159,164" fill="#dc2626"/>
  <text x="162" y="164" font-size="12" font-style="italic" font-family="Times New Roman" fill="#dc2626">P</text>
  <text x="82" y="168" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${inclinedAngle}</text>
</svg>`;
      }

      if (physMode === 'wave') {
        let pathD = 'M 24,104 ';
        for (let px = 24; px <= 296; px += 3) {
          const t = ((px - 24) / 272) * 4 * Math.PI;
          const py = 104 - 52 * Math.sin(t);
          pathD += `L ${px},${py.toFixed(1)} `;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <line x1="20" y1="104" x2="304" y2="104" stroke="${strokeColor}" stroke-width="1.4"/>
  <line x1="24" y1="28" x2="24" y2="180" stroke="${strokeColor}" stroke-width="1.4"/>
  <path d="${pathD}" fill="none" stroke="${accentColor}" stroke-width="2.2"/>
  <text x="296" y="96" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">x</text>
  <text x="30" y="34" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">u</text>
</svg>`;
      }

      // lens
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <line x1="20" y1="104" x2="300" y2="104" stroke="${strokeColor}" stroke-width="1.3"/>
  <line x1="160" y1="22" x2="160" y2="186" stroke="${accentColor}" stroke-width="2.2"/>
  <polygon points="155,28 160,18 165,28" fill="${accentColor}"/>
  <polygon points="155,180 160,190 165,180" fill="${accentColor}"/>
  <line x1="72" y1="104" x2="72" y2="62" stroke="${strokeColor}" stroke-width="2"/>
  <polygon points="68,68 72,58 76,68" fill="${strokeColor}"/>
  <line x1="72" y1="62" x2="160" y2="62" stroke="#dc2626" stroke-width="1.4"/>
  <line x1="160" y1="62" x2="275" y2="146" stroke="#dc2626" stroke-width="1.4"/>
  <line x1="72" y1="62" x2="275" y2="152" stroke="#059669" stroke-width="1.4"/>
  <circle cx="110" cy="104" r="2.2" fill="${strokeColor}"/>
  <circle cx="210" cy="104" r="2.2" fill="${strokeColor}"/>
  <text x="106" y="120" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">F</text>
  <text x="206" y="120" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">F'</text>
  <text x="68" y="120" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">A</text>
  <text x="62" y="54" font-size="12" font-style="italic" font-family="Times New Roman" fill="${strokeColor}">B</text>
</svg>`;
    }

    // Chemistry
    if (chemMode === 'flask') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <path d="M 136,34 L 136,76 L 96,158 Q 92,168 104,168 L 216,168 Q 228,168 224,158 L 184,76 L 184,34" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  <line x1="130" y1="34" x2="190" y2="34" stroke="${strokeColor}" stroke-width="2.2"/>
  <path d="M 110,132 L 210,132 L 222,158 Q 225,166 215,166 L 105,166 Q 95,166 98,158 Z" fill="#bfdbfe" opacity="0.75"/>
  <text x="160" y="190" text-anchor="middle" font-size="12" font-family="Times New Roman" fill="${strokeColor}">${chemLabel}</text>
</svg>`;
    }

    if (chemMode === 'gas_prep') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="44" y="88" width="52" height="74" rx="14" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  <rect x="46" y="132" width="48" height="28" rx="10" fill="#bae6fd"/>
  <path d="M 70,88 L 70,48 L 216,48 L 216,120" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  <rect x="176" y="102" width="96" height="68" fill="#e0f2fe" stroke="${strokeColor}" stroke-width="1.6"/>
  <rect x="200" y="64" width="48" height="74" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.8"/>
  <text x="70" y="182" text-anchor="middle" font-size="11" font-family="Times New Roman" fill="${strokeColor}">Bình phản ứng</text>
  <text x="224" y="186" text-anchor="middle" font-size="11" font-family="Times New Roman" fill="${strokeColor}">Thu khí đẩy nước</text>
</svg>`;
    }

    // benzene ring
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${width}" height="${height}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <polygon points="160,42 212,72 212,132 160,162 108,132 108,72" fill="none" stroke="${strokeColor}" stroke-width="2.2"/>
  <circle cx="160" cy="102" r="32" fill="none" stroke="${accentColor}" stroke-width="1.8"/>
</svg>`;
  }, [tab, mathMode, fnExpr, triLabels, triAngle, bbtHeader, bbtSign, physMode, physLabel1, physLabel2, inclinedAngle, chemMode, chemLabel, strokeColor, accentColor, width, height]);

  const handleInsert = () => {
    const titleMap: Record<string, string> = {
      graph: `Đồ thị hàm số y = ${fnExpr}`,
      triangle: `Tam giác ${triLabels}`,
      circle: 'Đường tròn tâm O',
      bbt: 'Bảng biến thiên',
      pyramid: 'Hình chóp S.ABC',
      circuit: 'Sơ đồ mạch điện',
      inclined: 'Vật trên mặt phẳng nghiêng',
      wave: 'Đồ thị sóng cơ',
      lens: 'Thấu kính hội tụ',
      flask: `Bình tam giác (${chemLabel})`,
      gas_prep: 'Sơ đồ điều chế thu khí',
      benzene: 'Vòng Benzen',
    };
    const key = tab === 'math' ? mathMode : tab === 'physics' ? physMode : chemMode;
    onInsertDiagram({
      id: `diag-${Date.now()}`,
      kind: tab,
      title: titleMap[key] || 'Hình vẽ khoa học',
      svgMarkup,
      width,
      height,
    });
  };

  return (
    <div className="space-y-3.5 text-[15px]">
      <div className="font-bold text-base text-[#0F172A]">Kho hình vẽ khoa học chuẩn (SVG)</div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {[
          { id: 'math', label: 'Toán học' },
          { id: 'physics', label: 'Vật lí' },
          { id: 'chemistry', label: 'Hóa học' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as DiagramKind)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id ? 'bg-white text-[#2563EB] shadow-xs font-semibold' : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'math' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'graph', label: 'Đồ thị hàm số' },
              { id: 'bbt', label: 'Bảng biến thiên' },
              { id: 'triangle', label: 'Tam giác' },
              { id: 'circle', label: 'Đường tròn' },
              { id: 'pyramid', label: 'Hình chóp S.ABC' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMathMode(m.id as typeof mathMode)}
                className={`px-3 py-2 rounded-xl border text-left text-sm cursor-pointer ${
                  mathMode === m.id
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] font-semibold'
                    : 'border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mathMode === 'graph' && (
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1">
                Hàm số thực tế y = f(x)
              </label>
              <input
                type="text"
                value={fnExpr}
                onChange={(e) => setFnExpr(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 font-mono text-[15px]"
                placeholder="VD: x^2 - 2*x - 1 hoặc sin(x)"
              />
            </div>
          )}

          {mathMode === 'triangle' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-sm text-[#475569] mb-1">Đỉnh (A,B,C)</label>
                <input
                  type="text"
                  value={triLabels}
                  onChange={(e) => setTriLabels(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#475569] mb-1">Số đo góc</label>
                <input
                  type="text"
                  value={triAngle}
                  onChange={(e) => setTriAngle(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                />
              </div>
            </div>
          )}

          {mathMode === 'bbt' && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-[#475569] mb-1">Các mốc x (cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={bbtHeader}
                  onChange={(e) => setBbtHeader(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#475569] mb-1">Dấu y' (cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  value={bbtSign}
                  onChange={(e) => setBbtSign(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'physics' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'circuit', label: 'Mạch điện' },
              { id: 'inclined', label: 'Mặt phẳng nghiêng' },
              { id: 'wave', label: 'Đồ thị sóng cơ' },
              { id: 'lens', label: 'Thấu kính hội tụ' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPhysMode(m.id as typeof physMode)}
                className={`px-3 py-2 rounded-xl border text-left text-sm cursor-pointer ${
                  physMode === m.id
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] font-semibold'
                    : 'border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {physMode === 'circuit' && (
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={physLabel1}
                onChange={(e) => setPhysLabel1(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                placeholder="Điện trở 1"
              />
              <input
                type="text"
                value={physLabel2}
                onChange={(e) => setPhysLabel2(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
                placeholder="Điện trở 2"
              />
            </div>
          )}
          {physMode === 'inclined' && (
            <input
              type="text"
              value={inclinedAngle}
              onChange={(e) => setInclinedAngle(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
              placeholder="Góc nghiêng (VD: 30°)"
            />
          )}
        </div>
      )}

      {tab === 'chemistry' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'flask', label: 'Bình tam giác' },
              { id: 'gas_prep', label: 'Điều chế thu khí' },
              { id: 'benzene', label: 'Vòng Benzen' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setChemMode(m.id as typeof chemMode)}
                className={`px-3 py-2 rounded-xl border text-left text-sm cursor-pointer ${
                  chemMode === m.id
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] font-semibold'
                    : 'border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {chemMode === 'flask' && (
            <input
              type="text"
              value={chemLabel}
              onChange={(e) => setChemLabel(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-[15px]"
              placeholder="Nhãn chất trong bình"
            />
          )}
        </div>
      )}

      {/* Style & size controls */}
      <div className="grid grid-cols-3 gap-2.5 items-center pt-1">
        <label className="text-sm text-[#475569]">
          Rộng ({width}px)
          <input
            type="range"
            min={200}
            max={440}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full mt-1"
          />
        </label>
        <label className="text-sm text-[#475569] flex flex-col">
          Nét chính
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="h-8 w-full rounded-lg border border-[#CBD5E1] mt-1"
          />
        </label>
        <label className="text-sm text-[#475569] flex flex-col">
          Nét nổi bật
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-8 w-full rounded-lg border border-[#CBD5E1] mt-1"
          />
        </label>
      </div>

      {/* Live Preview */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-2.5 flex items-center justify-center overflow-hidden">
        <div
          className="max-w-full"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>

      <button
        type="button"
        onClick={handleInsert}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 min-h-[42px] text-[15px] font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Chèn hình vẽ vào câu hỏi
      </button>
    </div>
  );
};
