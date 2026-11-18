import {
  ExamDocument,
  ExamMatrix,
  ExamSpecification,
  QualityCheckItem,
  TextbookLesson,
} from '../types';

function normalizeStem(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:?!]/g, '')
    .trim();
}

// Deterministic simple arithmetic check for expressions like "a + b = c" or "a * b = c" in solution/answer
function checkDeterministicArithmetic(stem: string, answer: string): string | null {
  const eqMatch = stem.match(/(\d+(?:\.\d+)?)\s*([+\-*/×])\s*(\d+(?:\.\d+)?)\s*=\s*\?/);
  if (!eqMatch) return null;
  const a = parseFloat(eqMatch[1]);
  const op = eqMatch[2];
  const b = parseFloat(eqMatch[3]);
  let expected: number | null = null;
  if (op === '+') expected = a + b;
  else if (op === '-') expected = a - b;
  else if (op === '*' || op === '×') expected = a * b;
  else if (op === '/' && b !== 0) expected = a / b;

  if (expected !== null) {
    const numAns = parseFloat(answer.replace(',', '.'));
    if (!Number.isNaN(numAns) && Math.abs(numAns - expected) > 1e-4) {
      return `Phép tính trong câu (${a} ${op} ${b}) cho kết quả ${expected}, nhưng đáp án ghi "${answer}".`;
    }
  }
  return null;
}

export function runExamQualityAudit(
  exam: ExamDocument,
  lessons: TextbookLesson[],
  matrix?: ExamMatrix,
  spec?: ExamSpecification
): QualityCheckItem[] {
  const checks: QualityCheckItem[] = [];
  const questions = exam.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  // 1. Total question count
  checks.push({
    id: 'total-questions',
    category: 'Cấu trúc',
    label: 'Tổng số câu hỏi',
    status: questions.length > 0 ? 'pass' : 'error',
    detail:
      questions.length > 0
        ? `Đề hiện có ${questions.length} câu hỏi.`
        : 'Đề kiểm tra chưa có câu hỏi nào.',
  });

  // 2. Total points check
  const sumPoints = Math.round(questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) * 100) / 100;
  const pointsDiff = Math.abs(sumPoints - exam.totalPoints);
  checks.push({
    id: 'total-points',
    category: 'Điểm số',
    label: 'Kiểm tra tổng điểm',
    status: pointsDiff < 0.01 ? 'pass' : 'error',
    detail:
      pointsDiff < 0.01
        ? `Tổng điểm các câu khớp thang điểm mục tiêu (${sumPoints}/${exam.totalPoints} điểm).`
        : `Tổng điểm hiện tại là ${sumPoints} điểm, chênh lệch so với thang điểm cấu hình ${exam.totalPoints} điểm.`,
  });

  // 3. Duplicate stems
  const seen = new Map<string, string[]>();
  for (const q of questions) {
    const key = normalizeStem(q.stem);
    if (!key) continue;
    const list = seen.get(key) || [];
    list.push(q.id);
    seen.set(key, list);
  }
  const duplicateIds = Array.from(seen.values())
    .filter((ids) => ids.length > 1)
    .flat();
  checks.push({
    id: 'duplicates',
    category: 'Nội dung',
    label: 'Phát hiện câu hỏi trùng lặp',
    status: duplicateIds.length === 0 ? 'pass' : 'warning',
    detail:
      duplicateIds.length === 0
        ? 'Không phát hiện câu hỏi có nội dung trùng lặp.'
        : `Phát hiện ${duplicateIds.length} câu hỏi có nội dung giống nhau.`,
    affectedQuestionIds: duplicateIds,
  });

  // 4. Missing answers
  const missingAnswers = questions.filter((q) => !q.correctAnswer || !q.correctAnswer.trim());
  checks.push({
    id: 'missing-answers',
    category: 'Đáp án',
    label: 'Kiểm tra thiếu đáp án',
    status: missingAnswers.length === 0 ? 'pass' : 'error',
    detail:
      missingAnswers.length === 0
        ? 'Tất cả câu hỏi đều đã có đáp án hoặc gợi ý chấm.'
        : `${missingAnswers.length} câu hỏi chưa có đáp án.`,
    affectedQuestionIds: missingAnswers.map((q) => q.id),
  });

  // 5. Missing explanations
  const missingExplanations = questions.filter((q) => !q.explanation || !q.explanation.trim());
  checks.push({
    id: 'missing-explanations',
    category: 'Hướng dẫn chấm',
    label: 'Kiểm tra lời giải chi tiết',
    status: missingExplanations.length === 0 ? 'pass' : 'warning',
    detail:
      missingExplanations.length === 0
        ? 'Tất cả câu hỏi đều có lời giải / hướng dẫn chấm.'
        : `${missingExplanations.length} câu hỏi chưa có lời giải chi tiết.`,
    affectedQuestionIds: missingExplanations.map((q) => q.id),
  });

  // 6. MCQ 4 options & valid A/B/C/D answer
  const malformedMcq = questions.filter((q) => {
    if (q.type !== 'mcq') return false;
    const validOpts = q.options && q.options.length === 4 && q.options.every((o) => o.trim().length > 0);
    const validKey = ['A', 'B', 'C', 'D'].includes(q.correctAnswer.trim().toUpperCase());
    return !validOpts || !validKey;
  });
  checks.push({
    id: 'mcq-structure',
    category: 'Định dạng',
    label: 'Cấu trúc trắc nghiệm 4 lựa chọn (A, B, C, D)',
    status: malformedMcq.length === 0 ? 'pass' : 'error',
    detail:
      malformedMcq.length === 0
        ? 'Các câu trắc nghiệm nhiều lựa chọn đều đủ 4 phương án và 1 đáp án đúng hợp lệ.'
        : `${malformedMcq.length} câu trắc nghiệm thiếu phương án hoặc đáp án không thuộc A/B/C/D.`,
    affectedQuestionIds: malformedMcq.map((q) => q.id),
  });

  // 7. True/False 4 items check
  const malformedTf = questions.filter(
    (q) => q.type === 'true_false' && (!q.trueFalseItems || q.trueFalseItems.length !== 4)
  );
  checks.push({
    id: 'tf-structure',
    category: 'Định dạng',
    label: 'Cấu trúc câu Đúng/Sai (4 ý a, b, c, d)',
    status: malformedTf.length === 0 ? 'pass' : 'error',
    detail:
      malformedTf.length === 0
        ? 'Các câu Đúng/Sai đều đủ 4 ý a, b, c, d.'
        : `${malformedTf.length} câu Đúng/Sai chưa đủ 4 ý.`,
    affectedQuestionIds: malformedTf.map((q) => q.id),
  });

  // 8. Formula delimiter balance ($ count)
  const unbalancedLatex = questions.filter((q) => {
    const text = [
      q.stem,
      ...(q.options || []),
      ...(q.trueFalseItems?.map((i) => i.statement) || []),
    ].join(' ');
    const stripped = text.replace(/\$\$/g, '');
    const count = (stripped.match(/(?<!\\)\$/g) || []).length;
    return count % 2 !== 0;
  });
  checks.push({
    id: 'latex-balance',
    category: 'Công thức',
    label: 'Cú pháp công thức Toán học ($...$)',
    status: unbalancedLatex.length === 0 ? 'pass' : 'warning',
    detail:
      unbalancedLatex.length === 0
        ? 'Các dấu phân cách công thức $...$ đều cân bằng.'
        : `${unbalancedLatex.length} câu hỏi có dấu $ chưa đóng mở cân xứng.`,
    affectedQuestionIds: unbalancedLatex.map((q) => q.id),
  });

  // 9. Deterministic arithmetic check
  const arithmeticErrors: { id: string; msg: string }[] = [];
  for (const q of questions) {
    const err = checkDeterministicArithmetic(q.stem, q.correctAnswer);
    if (err) arithmeticErrors.push({ id: q.id, msg: err });
  }
  checks.push({
    id: 'arithmetic-verify',
    category: 'Tính toán xác định',
    label: 'Kiểm tra phép tính số học trực tiếp',
    status: arithmeticErrors.length === 0 ? 'pass' : 'error',
    detail:
      arithmeticErrors.length === 0
        ? 'Không phát hiện sai lệch phép tính số học tường minh.'
        : arithmeticErrors.map((e) => e.msg).join(' '),
    affectedQuestionIds: arithmeticErrors.map((e) => e.id),
  });

  // 10. Duration suitability heuristic
  const estimatedMin = questions.reduce((acc, q) => {
    if (q.type === 'mcq') return acc + 1.2;
    if (q.type === 'true_false') return acc + 3.5;
    if (q.type === 'short_answer') return acc + 3.0;
    if (q.type === 'essay') return acc + 10;
    return acc + 2;
  }, 0);
  const durationTooTight = estimatedMin > exam.durationMinutes * 1.35;
  checks.push({
    id: 'duration-fit',
    category: 'Thời lượng',
    label: 'Phù hợp thời gian làm bài',
    status: durationTooTight ? 'warning' : 'pass',
    detail: durationTooTight
      ? `Số câu hiện tại ước tính cần ~${Math.round(estimatedMin)} phút, vượt thời lượng ${exam.durationMinutes} phút. Giáo viên cân nhắc giảm câu hoặc tăng thời gian.`
      : `Thời lượng ${exam.durationMinutes} phút phù hợp với ${questions.length} câu hỏi (ước tính ~${Math.round(estimatedMin)} phút).`,
  });

  // 11. Textbook source verification
  const selectedLessons = lessons.filter((l) => exam.sourceRef.lessonIds.includes(l.id));
  const allVerified =
    selectedLessons.length > 0 &&
    selectedLessons.every((l) => l.verificationStatus === 'verified');
  checks.push({
    id: 'source-grounding',
    category: 'Nguồn kiến thức',
    label: 'Bám sát nguồn SGK đã xác minh',
    status:
      selectedLessons.length === 0
        ? 'unverified'
        : allVerified
          ? 'pass'
          : 'warning',
    detail:
      selectedLessons.length === 0
        ? 'Đề chưa gắn bài học SGK làm nguồn đối chiếu.'
        : allVerified
          ? `Đã gắn ${selectedLessons.length} bài học SGK ở trạng thái Đã xác minh.`
          : 'Có bài học nguồn chưa ở trạng thái Đã xác minh.',
  });

  // 12. Matrix alignment check
  if (matrix) {
    const matrixTotalQ = matrix.rows.reduce(
      (sum, r) => sum + r.nbCount + r.thCount + r.vdCount + r.vdcCount,
      0
    );
    const matrixPts = Math.round(matrix.rows.reduce((sum, r) => sum + r.points, 0) * 100) / 100;
    const match = matrixTotalQ === questions.length && Math.abs(matrixPts - sumPoints) < 0.01;
    checks.push({
      id: 'matrix-sync',
      category: 'Ma trận & Đặc tả',
      label: 'Khớp ma trận đề',
      status: match ? 'pass' : 'warning',
      detail: match
        ? `Số câu (${questions.length}) và tổng điểm (${sumPoints}) khớp với ma trận.`
        : `Ma trận có ${matrixTotalQ} câu (${matrixPts}đ), trong khi đề thực tế có ${questions.length} câu (${sumPoints}đ).`,
    });
  } else {
    checks.push({
      id: 'matrix-sync',
      category: 'Ma trận & Đặc tả',
      label: 'Khớp ma trận đề',
      status: 'unverified',
      detail: 'Chưa liên kết ma trận đề để đối chiếu.',
    });
  }

  // 13. Specification alignment check
  if (spec) {
    const specCount = spec.rows.reduce((sum, r) => sum + r.questionCount, 0);
    checks.push({
      id: 'spec-sync',
      category: 'Ma trận & Đặc tả',
      label: 'Khớp bảng đặc tả',
      status: specCount === questions.length ? 'pass' : 'warning',
      detail:
        specCount === questions.length
          ? `Số lượng câu hỏi khớp bảng đặc tả (${specCount} câu).`
          : `Bảng đặc tả ghi ${specCount} câu, đề thực tế có ${questions.length} câu.`,
    });
  }

  return checks;
}
