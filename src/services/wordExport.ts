import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Math as DocxMath,
  MathFraction,
  MathRadical,
  MathRun,
  MathSubScript,
  MathSuperScript,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  ExamDocument,
  ExamMatrix,
  ExamQuestion,
  ExamSpecification,
} from '../types';
import { COGNITIVE_LEVEL_LABELS, QUESTION_TYPE_LABELS } from '../data/curriculum';

const FONT_NAME = 'Times New Roman';
const FONT_SIZE_HALF_PT = 26; // 13pt
const SMALL_SIZE_HALF_PT = 24; // 12pt

const LATEX_SYMBOL_MAP: Record<string, string> = {
  '\\Rightarrow': '⇒',
  '\\Leftrightarrow': '⇔',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\subseteq': '⊆',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\setminus': '\\',
  '\\varnothing': '∅',
  '\\le': '≤',
  '\\ge': '≥',
  '\\ne': '≠',
  '\\approx': '≈',
  '\\pm': '±',
  '\\cdot': '·',
  '\\times': '×',
  '\\infty': '∞',
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\Delta': 'Δ',
  '\\delta': 'δ',
  '\\omega': 'ω',
  '\\varphi': 'φ',
  '\\pi': 'π',
  '\\theta': 'θ',
  '\\lambda': 'λ',
  '\\circ': '°',
  '\\mathbb{R}': 'ℝ',
  '\\mathbb{N}': 'ℕ',
  '\\mathbb{Z}': 'ℤ',
  '\\mathbb{Q}': 'ℚ',
  '\\sin': 'sin',
  '\\cos': 'cos',
  '\\tan': 'tan',
  '\\cot': 'cot',
  '\\log': 'log',
  '\\ln': 'ln',
  '\\lim': 'lim',
  '\\max': 'max',
  '\\min': 'min',
  '\\rightleftharpoons': '⇌',
  '\\xrightarrow': '→',
};

function replaceSimpleSymbols(str: string): string {
  let out = str;
  for (const [key, val] of Object.entries(LATEX_SYMBOL_MAP)) {
    out = out.split(key).join(val);
  }
  out = out
    .replace(/\\overline\{([^}]+)\}/g, '$1\u0304')
    .replace(/\\vec\{([^}]+)\}/g, '$1\u20D7')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\^\\circ/g, '°');
  return out;
}

function readBracedGroup(input: string, startIdx: number): [string, number] {
  if (input[startIdx] !== '{') {
    return [input[startIdx] || '', startIdx + 1];
  }
  let depth = 0;
  let i = startIdx;
  while (i < input.length) {
    if (input[i] === '{') depth++;
    else if (input[i] === '}') {
      depth--;
      if (depth === 0) {
        return [input.slice(startIdx + 1, i), i + 1];
      }
    }
    i++;
  }
  return [input.slice(startIdx + 1), input.length];
}

// Convert LaTeX expression into native Word OMML components (MathRun, MathFraction, MathRadical, MathSuperScript, MathSubScript)
function latexToOmmlChildren(latex: string): any[] {
  const children: any[] = [];
  let i = 0;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      children.push(new MathRun(replaceSimpleSymbols(buffer)));
      buffer = '';
    }
  };

  while (i < latex.length) {
    if (latex.startsWith('\\frac', i)) {
      flushBuffer();
      i += 5;
      while (latex[i] === ' ') i++;
      const [num, next1] = readBracedGroup(latex, i);
      i = next1;
      while (latex[i] === ' ') i++;
      const [den, next2] = readBracedGroup(latex, i);
      i = next2;
      children.push(
        new MathFraction({
          numerator: latexToOmmlChildren(num),
          denominator: latexToOmmlChildren(den),
        })
      );
      continue;
    }

    if (latex.startsWith('\\sqrt', i)) {
      flushBuffer();
      i += 5;
      while (latex[i] === ' ') i++;
      let degreeStr: string | undefined;
      if (latex[i] === '[') {
        const endBracket = latex.indexOf(']', i);
        if (endBracket !== -1) {
          degreeStr = latex.slice(i + 1, endBracket);
          i = endBracket + 1;
        }
      }
      const [radicand, nextIdx] = readBracedGroup(latex, i);
      i = nextIdx;
      children.push(
        new MathRadical({
          children: latexToOmmlChildren(radicand),
          ...(degreeStr ? { degree: latexToOmmlChildren(degreeStr) } : {}),
        })
      );
      continue;
    }

    if (latex[i] === '^' || latex[i] === '_') {
      const isSuper = latex[i] === '^';
      const baseText = buffer.slice(-1) || '';
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
      }
      flushBuffer();
      const baseRuns = baseText
        ? [new MathRun(replaceSimpleSymbols(baseText))]
        : children.length > 0
          ? [children.pop()]
          : [new MathRun('')];

      const [scriptContent, nextIdx] = readBracedGroup(latex, i + 1);
      i = nextIdx;

      if (isSuper) {
        children.push(
          new MathSuperScript({
            children: baseRuns,
            superScript: latexToOmmlChildren(scriptContent),
          })
        );
      } else {
        children.push(
          new MathSubScript({
            children: baseRuns,
            subScript: latexToOmmlChildren(scriptContent),
          })
        );
      }
      continue;
    }

    // Check known symbol macros
    let matchedMacro = false;
    if (latex[i] === '\\') {
      for (const macro of Object.keys(LATEX_SYMBOL_MAP).sort((a, b) => b.length - a.length)) {
        if (latex.startsWith(macro, i)) {
          buffer += LATEX_SYMBOL_MAP[macro];
          i += macro.length;
          matchedMacro = true;
          break;
        }
      }
      if (matchedMacro) continue;
    }

    buffer += latex[i];
    i++;
  }

  flushBuffer();
  return children.length > 0 ? children : [new MathRun('')];
}

function buildRichParagraphRuns(text: string, options?: { bold?: boolean; italic?: boolean; size?: number }): any[] {
  const runs: any[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\n])+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const size = options?.size ?? FONT_SIZE_HALF_PT;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex, match.index),
          font: FONT_NAME,
          size,
          bold: options?.bold,
          italics: options?.italic,
        })
      );
    }
    const token = match[0];
    const latex = token.startsWith('$$') ? token.slice(2, -2).trim() : token.slice(1, -1).trim();
    runs.push(
      new DocxMath({
        children: latexToOmmlChildren(latex),
      })
    );
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.slice(lastIndex),
        font: FONT_NAME,
        size,
        bold: options?.bold,
        italics: options?.italic,
      })
    );
  }
  return runs;
}

async function svgToPngUint8Array(svgMarkup: string, width: number, height: number): Promise<Uint8Array | null> {
  if (typeof window === 'undefined') return null;
  try {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG load error'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export type WordExportMode = 'exam_only' | 'exam_with_answers' | 'exam_with_solutions' | 'full_dossier';

export async function buildExamDocxBlob(
  exam: ExamDocument,
  mode: WordExportMode = 'exam_with_answers',
  matrix?: ExamMatrix,
  spec?: ExamSpecification
): Promise<Blob> {
  const children: any[] = [];

  // Header Table (Department/School on left, Exam Title on right)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: exam.header.departmentName, font: FONT_NAME, size: SMALL_SIZE_HALF_PT }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: exam.header.schoolName, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Năm học ${exam.header.schoolYear}`, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, italics: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: exam.header.examTitle, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Môn: ${exam.header.subjectLabel} — ${exam.header.gradeLabel}`,
                    font: FONT_NAME,
                    size: SMALL_SIZE_HALF_PT,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Thời gian làm bài: ${exam.header.durationLabel} (Mã đề: ${exam.header.examCode})`,
                    font: FONT_NAME,
                    size: SMALL_SIZE_HALF_PT,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);

  if (exam.header.showStudentInfo) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 160 },
        children: [
          new TextRun({
            text: 'Họ và tên thí sinh: .................................................................   Lớp: ...................   SBD: ...................',
            font: FONT_NAME,
            size: SMALL_SIZE_HALF_PT,
          }),
        ],
      })
    );
  }

  // Group questions by section
  for (const section of exam.sections) {
    const secQuestions = exam.questions
      .filter((q) => q.sectionId === section.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (secQuestions.length === 0) continue;

    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({ text: section.title, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true }),
        ],
      })
    );

    if (section.description) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: section.description, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, italics: true }),
          ],
        })
      );
    }

    for (const q of secQuestions) {
      await appendQuestionToDocx(children, q);
    }
  }

  // Unassigned section fallback
  const sectionIds = new Set(exam.sections.map((s) => s.id));
  const orphanQuestions = exam.questions.filter((q) => !sectionIds.has(q.sectionId));
  for (const q of orphanQuestions) {
    await appendQuestionToDocx(children, q);
  }

  // Answer Key & Solutions
  if (mode !== 'exam_only') {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: `ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM — MÃ ĐỀ ${exam.header.examCode}`,
            font: FONT_NAME,
            size: FONT_SIZE_HALF_PT,
            bold: true,
          }),
        ],
      })
    );

    const answerRows = exam.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(
        (q, idx) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 12, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Câu ${idx + 1}`, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true })] })],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: QUESTION_TYPE_LABELS[q.type], font: FONT_NAME, size: SMALL_SIZE_HALF_PT })] })],
              }),
              new TableCell({
                width: { size: 26, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: buildRichParagraphRuns(q.correctAnswer, { bold: true, size: SMALL_SIZE_HALF_PT }) })],
              }),
              new TableCell({
                width: { size: 12, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${q.points}`, font: FONT_NAME, size: SMALL_SIZE_HALF_PT })] })],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: COGNITIVE_LEVEL_LABELS[q.cognitiveLevel], font: FONT_NAME, size: SMALL_SIZE_HALF_PT })] })],
              }),
            ],
          })
      );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Câu', 'Dạng câu hỏi', 'Đáp án', 'Điểm', 'Mức độ'].map(
              (label) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: label, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true })],
                    }),
                  ],
                })
            ),
          }),
          ...answerRows,
        ],
      })
    );

    if (mode === 'exam_with_solutions' || mode === 'full_dossier') {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({ text: 'HƯỚNG DẪN GIẢI CHI TIẾT', font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true }),
          ],
        })
      );

      for (const [idx, q] of exam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex).entries()) {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({ text: `Câu ${idx + 1} (${q.points} điểm): `, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true }),
              ...buildRichParagraphRuns(q.explanation || 'Chưa có lời giải chi tiết.', { size: SMALL_SIZE_HALF_PT }),
            ],
          })
        );
      }
    }
  }

  // Optional Matrix & Spec in full_dossier
  if (mode === 'full_dossier' && matrix && matrix.rows.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: `MA TRẬN ĐỀ KIỂM TRA: ${matrix.title}`, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true })],
      })
    );
    children.push(buildMatrixDocxTable(matrix));
  }

  if (mode === 'full_dossier' && spec && spec.rows.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: `BẢNG ĐẶC TẢ ĐỀ KIỂM TRA: ${spec.title}`, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true })],
      })
    );
    children.push(buildSpecDocxTable(spec));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 850, bottom: 850, left: 1134, right: 850 }, // 1.5cm top/bottom/right, 2cm left
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

async function appendQuestionToDocx(children: any[], q: ExamQuestion) {
  if (q.sharedPassage) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: buildRichParagraphRuns(q.sharedPassage, { italic: true, size: SMALL_SIZE_HALF_PT }),
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: `Câu ${q.orderIndex + 1} (${q.points}đ): `,
          font: FONT_NAME,
          size: FONT_SIZE_HALF_PT,
          bold: true,
        }),
        ...buildRichParagraphRuns(q.stem),
      ],
    })
  );

  if (q.diagram?.svgMarkup) {
    const pngData = await svgToPngUint8Array(q.diagram.svgMarkup, q.diagram.width || 320, q.diagram.height || 200);
    if (pngData) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new ImageRun({
              data: pngData,
              transformation: { width: q.diagram.width || 300, height: q.diagram.height || 180 },
              type: 'png',
            }),
          ],
        })
      );
    }
  }

  if (q.type === 'mcq' && q.options && q.options.length > 0) {
    const labels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < q.options.length; i++) {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: `${labels[i] || i + 1}. `, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true }),
            ...buildRichParagraphRuns(q.options[i]),
          ],
        })
      );
    }
  }

  if (q.type === 'true_false' && q.trueFalseItems && q.trueFalseItems.length > 0) {
    for (const item of q.trueFalseItems) {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({ text: `${item.label}) `, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true }),
            ...buildRichParagraphRuns(item.statement),
          ],
        })
      );
    }
  }
}

function buildMatrixDocxTable(matrix: ExamMatrix): Table {
  const headers = ['TT', 'Chương/Chủ đề', 'Đơn vị kiến thức', 'Dạng câu', 'NB', 'TH', 'VD', 'VDC', 'Điểm', 'Tỉ lệ %'];
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true })] })],
        })
    ),
  });
  const rows = matrix.rows.map(
    (r) =>
      new TableRow({
        children: [
          String(r.stt),
          r.chapterTitle,
          r.knowledgeUnit,
          QUESTION_TYPE_LABELS[r.questionType],
          String(r.nbCount),
          String(r.thCount),
          String(r.vdCount),
          String(r.vdcCount),
          String(r.points),
          `${r.percentage}%`,
        ].map(
          (val) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: val, font: FONT_NAME, size: SMALL_SIZE_HALF_PT })] })],
            })
        ),
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

function buildSpecDocxTable(spec: ExamSpecification): Table {
  const headers = ['TT', 'Chương/Chủ đề', 'Đơn vị kiến thức', 'Yêu cầu cần đạt', 'Mức độ', 'Dạng câu', 'Số câu', 'Mã câu'];
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: FONT_NAME, size: SMALL_SIZE_HALF_PT, bold: true })] })],
        })
    ),
  });
  const rows = spec.rows.map(
    (r) =>
      new TableRow({
        children: [
          String(r.stt),
          r.chapterTitle,
          r.knowledgeUnit,
          r.learningOutcome,
          COGNITIVE_LEVEL_LABELS[r.cognitiveLevel],
          QUESTION_TYPE_LABELS[r.questionType],
          String(r.questionCount),
          r.questionNumbers,
        ].map(
          (val) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: val, font: FONT_NAME, size: SMALL_SIZE_HALF_PT })] })],
            })
        ),
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

export async function exportExamToWord(
  exam: ExamDocument,
  mode: WordExportMode = 'exam_with_answers',
  matrix?: ExamMatrix,
  spec?: ExamSpecification
): Promise<void> {
  const blob = await buildExamDocxBlob(exam, mode, matrix, spec);
  const safeName = exam.title.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'De_kiem_tra';
  saveAs(blob, `${safeName}_MaDe_${exam.header.examCode}.docx`);
}

export async function exportMatrixToWord(matrix: ExamMatrix): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 16838, height: 11906 }, margin: { top: 720, bottom: 720, left: 850, right: 850 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: `MA TRẬN ĐỀ KIỂM TRA — ${matrix.title}`, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true })],
          }),
          buildMatrixDocxTable(matrix),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ma_tran_${matrix.subject}_Lop${matrix.grade}.docx`);
}

export async function exportSpecToWord(spec: ExamSpecification): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 16838, height: 11906 }, margin: { top: 720, bottom: 720, left: 850, right: 850 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: `BẢNG ĐẶC TẢ ĐỀ KIỂM TRA — ${spec.title}`, font: FONT_NAME, size: FONT_SIZE_HALF_PT, bold: true })],
          }),
          buildSpecDocxTable(spec),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Bang_dac_ta_${spec.subject}_Lop${spec.grade}.docx`);
}

export function exportMatrixToExcel(matrix: ExamMatrix): void {
  const data = matrix.rows.map((r) => ({
    STT: r.stt,
    'Chương/Chủ đề': r.chapterTitle,
    'Nội dung kiến thức': r.contentArea,
    'Đơn vị kiến thức': r.knowledgeUnit,
    'Dạng câu hỏi': QUESTION_TYPE_LABELS[r.questionType],
    'Nhận biết': r.nbCount,
    'Thông hiểu': r.thCount,
    'Vận dụng': r.vdCount,
    'Vận dụng cao': r.vdcCount,
    'Số ý': r.subItemCount,
    'Điểm số': r.points,
    'Tỉ lệ (%)': r.percentage,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'MaTranDe');
  XLSX.writeFile(wb, `Ma_tran_${matrix.subject}_Lop${matrix.grade}.xlsx`);
}

export function exportSpecToExcel(spec: ExamSpecification): void {
  const data = spec.rows.map((r) => ({
    STT: r.stt,
    'Chương/Chủ đề': r.chapterTitle,
    'Đơn vị kiến thức': r.knowledgeUnit,
    'Yêu cầu cần đạt': r.learningOutcome,
    'Mức độ': COGNITIVE_LEVEL_LABELS[r.cognitiveLevel],
    'Dạng câu hỏi': QUESTION_TYPE_LABELS[r.questionType],
    'Số câu': r.questionCount,
    'Số ý': r.subItemCount,
    'Mã câu hỏi': r.questionNumbers,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BangDacTa');
  XLSX.writeFile(wb, `Bang_dac_ta_${spec.subject}_Lop${spec.grade}.xlsx`);
}
