import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ExamDocument, ExamQuestion, ShuffledVariant } from '../types';
import { buildExamDocxBlob } from './wordExport';

const FIXED_OPTION_PATTERNS = [
  /tất cả (các )?(phương án|đáp án|ý|câu) trên/i,
  /cả [a-d](\s*,\s*[a-d])*\s*(và|,)\s*[a-d]\s*(đều )?(đúng|sai)/i,
  /không có (phương án|đáp án) nào đúng/i,
  /tất cả đều (đúng|sai)/i,
];

function isOrderDependentOption(text: string): boolean {
  return FIXED_OPTION_PATTERNS.some((re) => re.test(text.trim()));
}

function fisherYates<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface ShuffleOptions {
  variantCodes: string[];
  shuffleQuestionOrder: boolean;
  shuffleMcqOptions: boolean;
  shuffleTrueFalseItems: boolean;
  keepDiagramQuestionsFixed: boolean;
}

export function generateExamVariants(
  exam: ExamDocument,
  opts: ShuffleOptions
): ShuffledVariant[] {
  const sortedBase = exam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const labels = ['A', 'B', 'C', 'D'];

  return opts.variantCodes.map((examCode) => {
    const resultQuestions: ExamQuestion[] = [];

    // Process each section separately so section boundaries stay valid
    const sectionOrder = exam.sections.map((s) => s.id);
    const allSectionIds = Array.from(
      new Set([...sectionOrder, ...sortedBase.map((q) => q.sectionId)])
    );

    let globalOrder = 0;

    for (const secId of allSectionIds) {
      const secQuestions = sortedBase.filter((q) => q.sectionId === secId);
      if (secQuestions.length === 0) continue;

      // Group questions by groupId (shared reading passage / shared diagram)
      const buckets: { fixed: boolean; items: ExamQuestion[] }[] = [];
      const seenGroups = new Set<string>();

      for (const q of secQuestions) {
        if (q.groupId) {
          if (seenGroups.has(q.groupId)) continue;
          seenGroups.add(q.groupId);
          const groupItems = secQuestions.filter((x) => x.groupId === q.groupId);
          const isFixed = groupItems.some(
            (x) => x.lockedOrder || (opts.keepDiagramQuestionsFixed && !!x.diagram)
          );
          buckets.push({ fixed: isFixed, items: groupItems });
        } else {
          const isFixed =
            !!q.lockedOrder || (opts.keepDiagramQuestionsFixed && !!q.diagram);
          buckets.push({ fixed: isFixed, items: [q] });
        }
      }

      let orderedBuckets = buckets;
      if (opts.shuffleQuestionOrder) {
        const movableIndices: number[] = [];
        const movableBuckets: typeof buckets = [];
        buckets.forEach((b, idx) => {
          if (!b.fixed) {
            movableIndices.push(idx);
            movableBuckets.push(b);
          }
        });
        const shuffledMovables = fisherYates(movableBuckets);
        orderedBuckets = [...buckets];
        movableIndices.forEach((slotIdx, i) => {
          orderedBuckets[slotIdx] = shuffledMovables[i];
        });
      }

      for (const bucket of orderedBuckets) {
        for (const origQ of bucket.items) {
          const qCopy: ExamQuestion = structuredClone(origQ);
          qCopy.orderIndex = globalOrder++;

          // Shuffle MCQ options safely
          if (
            opts.shuffleMcqOptions &&
            qCopy.type === 'mcq' &&
            qCopy.options &&
            qCopy.options.length === 4
          ) {
            const hasFixedOption = qCopy.options.some(isOrderDependentOption);
            const origCorrectIdx = labels.indexOf(qCopy.correctAnswer.trim().toUpperCase());

            if (!hasFixedOption && origCorrectIdx !== -1) {
              const indexed = qCopy.options.map((text, idx) => ({
                text,
                isCorrect: idx === origCorrectIdx,
              }));
              const shuffled = fisherYates(indexed);
              qCopy.options = shuffled.map((x) => x.text);
              const newCorrectIdx = shuffled.findIndex((x) => x.isCorrect);
              qCopy.correctAnswer = labels[newCorrectIdx] || qCopy.correctAnswer;
            }
          }

          // Shuffle True/False sub-items a, b, c, d if enabled
          if (
            opts.shuffleTrueFalseItems &&
            qCopy.type === 'true_false' &&
            qCopy.trueFalseItems &&
            qCopy.trueFalseItems.length === 4
          ) {
            const shuffledItems = fisherYates(qCopy.trueFalseItems);
            const subLabels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
            qCopy.trueFalseItems = shuffledItems.map((it, idx) => ({
              ...it,
              label: subLabels[idx],
            }));
            qCopy.correctAnswer = qCopy.trueFalseItems
              .map((it) => `${it.label}-${it.isTrue ? 'Đ' : 'S'}`)
              .join('; ');
          }

          resultQuestions.push(qCopy);
        }
      }
    }

    const answerKey = resultQuestions.map((vq, idx) => {
      const origPos = sortedBase.findIndex((oq) => oq.id === vq.id);
      return {
        variantNumber: idx + 1,
        originalNumber: origPos >= 0 ? origPos + 1 : idx + 1,
        questionId: vq.id,
        type: vq.type,
        correctAnswer: vq.correctAnswer,
        points: vq.points,
      };
    });

    return {
      examCode,
      questions: resultQuestions,
      answerKey,
    };
  });
}

export async function exportVariantsZip(
  baseExam: ExamDocument,
  variants: ShuffledVariant[]
): Promise<void> {
  const zip = new JSZip();

  for (const variant of variants) {
    const variantExam: ExamDocument = {
      ...baseExam,
      header: { ...baseExam.header, examCode: variant.examCode },
      questions: variant.questions,
    };
    const docxBlob = await buildExamDocxBlob(variantExam, 'exam_only');
    zip.file(`De_Ma_${variant.examCode}.docx`, docxBlob);
  }

  // Build combined Excel Answer Key & Mapping sheet
  const wb = XLSX.utils.book_new();
  const maxLen = Math.max(...variants.map((v) => v.answerKey.length), 0);
  const summaryRows: Record<string, string | number>[] = [];

  for (let i = 0; i < maxLen; i++) {
    const row: Record<string, string | number> = { Câu: i + 1 };
    for (const v of variants) {
      const entry = v.answerKey[i];
      row[`Mã ${v.examCode}`] = entry ? entry.correctAnswer : '';
      row[`Gốc (${v.examCode})`] = entry ? `Câu ${entry.originalNumber}` : '';
    }
    summaryRows.push(row);
  }

  const ws = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws, 'DapAnCacMaDe');
  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  zip.file('Bang_Dap_An_Va_Anh_Xa.xlsx', xlsxBuffer);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safeTitle = baseExam.title.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 50) || 'De_tron';
  saveAs(zipBlob, `${safeTitle}_${variants.length}_MaDe.zip`);
}
