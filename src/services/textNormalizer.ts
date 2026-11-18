import { ExamQuestion } from '../types';

export function normalizeExamWhitespaceAndSymbols(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,;:?!])/g, '$1')
    .replace(/([.,;:?!])([^\s\d.,;:?!)}\]"'])/g, '$1 $2')
    .replace(/<=/g, '\\le ')
    .replace(/>=/g, '\\ge ')
    .replace(/!=/g, '\\ne ')
    .trim();
}

export function normalizeQuestionList(questions: ExamQuestion[]): ExamQuestion[] {
  return questions.map((q, idx) => ({
    ...q,
    orderIndex: idx,
    stem: normalizeExamWhitespaceAndSymbols(q.stem),
    options: q.options?.map((opt) =>
      normalizeExamWhitespaceAndSymbols(opt.replace(/^[A-Da-d][.)]\s*/, ''))
    ),
    trueFalseItems: q.trueFalseItems?.map((item, i) => ({
      ...item,
      label: (['a', 'b', 'c', 'd'] as const)[i] || item.label,
      statement: normalizeExamWhitespaceAndSymbols(
        item.statement.replace(/^[a-d][.)]\s*/i, '')
      ),
    })),
  }));
}

export function parsePlainTextToQuestions(
  rawText: string,
  sectionId: string,
  defaultPoints = 0.5
): ExamQuestion[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Split by "Câu 1", "Câu 2:", "Bài 1."...
  const blocks = normalized
    .split(/(?=(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[.:])/gi)
    .map((b) => b.trim())
    .filter(Boolean);

  const questions: ExamQuestion[] = [];
  const labels = ['A', 'B', 'C', 'D'];

  blocks.forEach((block, idx) => {
    const cleanBlock = block.replace(/^(?:Câu|Bài)\s+\d+\s*[.:]\s*/i, '').trim();
    // Look for Answer line at the end: "Đáp án: A" or "Đáp án: ..."
    let correctAnswer = 'A';
    let explanation = '';
    let workingBlock = cleanBlock;

    const solMatch = workingBlock.match(/(?:\n|\s)(?:Lời giải|Hướng dẫn chấm)\s*[:.]\s*([\s\S]+)$/i);
    if (solMatch) {
      explanation = solMatch[1].trim();
      workingBlock = workingBlock.slice(0, solMatch.index).trim();
    }

    const ansMatch = workingBlock.match(/(?:\n|\s)Đáp án\s*[:.]\s*([^\n]+)/i);
    if (ansMatch) {
      correctAnswer = ansMatch[1].trim();
      workingBlock = workingBlock.slice(0, ansMatch.index).trim();
    }

    // Check if MCQ options A. B. C. D. exist
    const optRegex = /(?:^|\n|\s)([A-D])[.)]\s+([\s\S]*?)(?=(?:\n|\s)[A-D][.)]\s+|$)/g;
    const optMatches = Array.from(workingBlock.matchAll(optRegex));

    if (optMatches.length >= 4) {
      const firstOptIdx = workingBlock.indexOf(optMatches[0][0]);
      const stem = workingBlock.slice(0, firstOptIdx).trim();
      const options = optMatches.slice(0, 4).map((m) => m[2].trim());
      questions.push({
        id: `q-imp-${Date.now()}-${idx}`,
        orderIndex: idx,
        sectionId,
        type: 'mcq',
        cognitiveLevel: 'NB',
        points: defaultPoints,
        stem,
        options,
        correctAnswer: labels.includes(correctAnswer.toUpperCase())
          ? correctAnswer.toUpperCase()
          : 'A',
        explanation,
      });
    } else {
      questions.push({
        id: `q-imp-${Date.now()}-${idx}`,
        orderIndex: idx,
        sectionId,
        type: 'essay',
        cognitiveLevel: 'TH',
        points: defaultPoints,
        stem: workingBlock,
        correctAnswer: ansMatch ? correctAnswer : '',
        explanation,
      });
    }
  });

  return questions;
}

export function splitExamAndAnswers(rawText: string): { examPart: string; answerPart: string } {
  const marker = rawText.search(/(?:^|\n)\s*(?:ĐÁP ÁN|HƯỚNG DẪN CHẤM|BẢNG ĐÁP ÁN)/i);
  if (marker === -1) {
    return { examPart: rawText.trim(), answerPart: '' };
  }
  return {
    examPart: rawText.slice(0, marker).trim(),
    answerPart: rawText.slice(marker).trim(),
  };
}
