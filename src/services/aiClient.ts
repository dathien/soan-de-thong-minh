import { ExamMatrixRow, ExamQuestion, TextbookLesson, UserDocument } from '../types';

export interface GenerateExamParams {
  prompt: string;
  subject: string;
  grade: number;
  examType: string;
  durationMinutes: number;
  totalPoints: number;
  sections?: { title: string; questionType: string; count?: number; pointsPerQuestion?: number }[];
  lessons: TextbookLesson[];
  documents: UserDocument[];
  strictSourceMode: boolean;
}

export interface GenerateExamResponse {
  summary: string;
  warnings?: string[];
  questions: Omit<ExamQuestion, 'id' | 'orderIndex' | 'sectionId'>[];
}

export async function apiCheckHealth(): Promise<{ ok: boolean; aiConfigured: boolean; model: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Không thể kiểm tra trạng thái máy chủ.');
  return res.json();
}

export async function apiGenerateExam(
  params: GenerateExamParams,
  signal?: AbortSignal
): Promise<GenerateExamResponse> {
  const res = await fetch('/api/ai/generate-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tạo đề từ trợ lý AI.');
  }
  return data;
}

export async function apiEditQuestion(
  question: ExamQuestion,
  instruction: string,
  lessons: TextbookLesson[],
  documents: UserDocument[],
  signal?: AbortSignal
): Promise<{ note: string; question: Omit<ExamQuestion, 'id' | 'orderIndex' | 'sectionId'> }> {
  const res = await fetch('/api/ai/edit-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, instruction, lessons, documents }),
    signal,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể chỉnh sửa câu hỏi bằng AI.');
  }
  return data;
}

export async function apiGenerateMatrix(
  params: {
    subject: string;
    grade: number;
    durationMinutes: number;
    totalPoints: number;
    lessons: TextbookLesson[];
    prompt?: string;
  },
  signal?: AbortSignal
): Promise<{ rows: Omit<ExamMatrixRow, 'id' | 'stt'>[] }> {
  const res = await fetch('/api/ai/generate-matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tạo ma trận bằng AI.');
  }
  return data;
}

export async function apiChatAssistant(
  params: {
    message: string;
    examSummary: unknown;
    lessons: TextbookLesson[];
    documents: UserDocument[];
  },
  signal?: AbortSignal
): Promise<{ reply: string }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Lỗi kết nối trợ lý AI.');
  }
  return data;
}
