export type AppModuleId =
  | 'home'
  | 'editor'
  | 'textbooks'
  | 'matrix'
  | 'specification'
  | 'bank'
  | 'vault'
  | 'shuffler'
  | 'omr'
  | 'tools'
  | 'guide'
  | 'settings';

export type UserRole = 'teacher' | 'admin';

export type VerificationStatus = 'verified' | 'draft' | 'test_sample' | 'unverified';

export type KnowledgeOriginType =
  | 'textbook_official'
  | 'curriculum_outcome'
  | 'system_summary'
  | 'sample_exercise';

export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'reading_comprehension'
  | 'practical';

export type ExamType =
  | 'regular'
  | '10min'
  | '15min'
  | '45min'
  | 'midterm'
  | 'final'
  | 'review'
  | 'thpt_grad'
  | 'gifted'
  | 'homework'
  | 'worksheet'
  | 'chapter_practice'
  | 'topic_practice';

export type ExamStatus = 'draft' | 'completed' | 'approved';

export interface KnowledgeUnit {
  id: string;
  title: string;
  originType: KnowledgeOriginType;
  summary: string;
  keyPoints: string[];
  formulas: string[];
  scientificSymbols: string[];
  definitionsAndTheorems: string[];
  learningOutcomes: string[];
  exerciseTypes: string[];
  scopeLimits: string;
  commonMistakes: string[];
}

export interface TextbookLesson {
  id: string;
  series: string; // e.g., 'Kết nối tri thức với cuộc sống'
  grade: number; // 1..12
  subject: string;
  bookTitle: string;
  editionYear: string;
  volume: 'Tập một' | 'Tập hai' | 'Chuyên đề học tập' | 'Sách một tập';
  chapterNumber: number;
  chapterTitle: string;
  lessonNumber: string;
  lessonTitle: string;
  pageStart?: number;
  pageEnd?: number;
  summary: string;
  coreKnowledge: string[];
  concepts: string[];
  terms: string[];
  formulas: string[];
  scientificSymbols: string[];
  theorems: string[];
  learningOutcomes: string[];
  exerciseTypes: string[];
  scopeLimits: string;
  commonMistakes: string[];
  referenceSource: string;
  verificationStatus: VerificationStatus;
  originType: KnowledgeOriginType;
  knowledgeUnits: KnowledgeUnit[];
  version: number;
  updatedAt: string;
}

export interface UserDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: 'docx' | 'pdf' | 'txt' | 'xlsx' | 'image';
  category:
    | 'sgk'
    | 'sgv'
    | 'lesson_plan'
    | 'sample_exam'
    | 'matrix'
    | 'specification'
    | 'review'
    | 'question_bank'
    | 'guidance';
  subject?: string;
  grade?: number;
  extractedText: string;
  warningNote?: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrueFalseSubItem {
  label: 'a' | 'b' | 'c' | 'd';
  statement: string;
  isTrue: boolean;
}

export interface QuestionDiagram {
  id: string;
  kind: 'math' | 'physics' | 'chemistry' | 'chart';
  title: string;
  svgMarkup: string;
  width: number;
  height: number;
  caption?: string;
  params?: Record<string, string | number>;
}

export interface ExamQuestion {
  id: string;
  orderIndex: number;
  sectionId: string;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  points: number;
  stem: string; // May contain inline LaTeX wrapped in $...$ or $$...$$
  options?: string[]; // For MCQ (A, B, C, D)
  trueFalseItems?: TrueFalseSubItem[]; // For true_false (4 sub-items)
  correctAnswer: string; // e.g. 'A', 'Đ-S-Đ-S', '12.5', or essay rubric summary
  explanation: string;
  sourceLessonId?: string;
  sourceUnitId?: string;
  learningOutcomeCode?: string;
  chapterTitle?: string;
  diagram?: QuestionDiagram;
  lockedOrder?: boolean;
  groupId?: string; // Shared passage / reading group
  sharedPassage?: string;
  needsReview?: boolean;
  reviewNote?: string;
  subject?: string;
  grade?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamSection {
  id: string;
  title: string;
  description?: string;
  questionType: QuestionType;
  pointsPerQuestion?: number;
}

export interface ExamHeaderConfig {
  departmentName: string;
  schoolName: string;
  subjectGroup: string;
  schoolYear: string;
  examTitle: string;
  subjectLabel: string;
  gradeLabel: string;
  durationLabel: string;
  examCode: string;
  showStudentInfo: boolean;
}

export interface ExamSourceRef {
  lessonIds: string[];
  unitIds: string[];
  documentIds: string[];
  series: string;
  grade: number;
  subject: string;
  strictSourceMode: boolean;
  capturedAt: string;
}

export interface ExamDocument {
  id: string;
  code: string;
  sequenceNumber: number;
  title: string;
  examType: ExamType;
  subject: string;
  grade: number;
  durationMinutes: number;
  totalPoints: number;
  status: ExamStatus;
  isFavorite?: boolean;
  isDeleted?: boolean;
  header: ExamHeaderConfig;
  sections: ExamSection[];
  questions: ExamQuestion[];
  sourceRef: ExamSourceRef;
  matrixId?: string;
  specificationId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamMatrixRow {
  id: string;
  stt: number;
  chapterTitle: string;
  contentArea: string;
  knowledgeUnit: string;
  lessonId?: string;
  questionType: QuestionType;
  nbCount: number;
  thCount: number;
  vdCount: number;
  vdcCount: number;
  subItemCount: number;
  points: number;
  percentage: number;
}

export interface ExamMatrix {
  id: string;
  title: string;
  subject: string;
  grade: number;
  durationMinutes: number;
  totalPoints: number;
  examId?: string;
  rows: ExamMatrixRow[];
  updatedAt: string;
}

export interface ExamSpecificationRow {
  id: string;
  stt: number;
  chapterTitle: string;
  knowledgeUnit: string;
  learningOutcome: string;
  cognitiveLevel: CognitiveLevel;
  questionType: QuestionType;
  questionCount: number;
  subItemCount: number;
  questionNumbers: string; // e.g. 'C1, C2, C5a'
  lessonId?: string;
}

export interface ExamSpecification {
  id: string;
  matrixId?: string;
  examId?: string;
  title: string;
  subject: string;
  grade: number;
  rows: ExamSpecificationRow[];
  updatedAt: string;
}

export interface ExamTemplateConfig {
  id: string;
  name: string;
  examType: ExamType;
  subject: string;
  gradeLevel: 'all' | 'thpt' | 'thcs' | 'tieuhoc';
  durationMinutes: number;
  totalPoints: number;
  sections: {
    title: string;
    questionType: QuestionType;
    count: number;
    pointsPerQuestion: number;
    description: string;
  }[];
  referenceSource: string;
  effectiveDate: string;
  isOfficialVerified: boolean;
}

export interface ShuffledVariant {
  examCode: string;
  questions: ExamQuestion[];
  answerKey: {
    variantNumber: number;
    originalNumber: number;
    questionId: string;
    type: QuestionType;
    correctAnswer: string;
    points: number;
  }[];
}

export interface QualityCheckItem {
  id: string;
  category: string;
  label: string;
  status: 'pass' | 'warning' | 'error' | 'unverified';
  detail: string;
  affectedQuestionIds?: string[];
}

export type UiFontSize = 16 | 18 | 20;
export type MotionLevel = 'off' | 'gentle' | 'lively';

export interface AppSettings {
  id: 'default';
  role: UserRole;
  teacherName: string;
  departmentName: string;
  schoolName: string;
  subjectGroup: string;
  schoolYear: string;
  defaultFontSizePt: number;
  uiFontSize: UiFontSize;
  motionLevel: MotionLevel;
  showBeginnerTips: boolean;
  autoSaveIntervalSec: number;
  firebaseConfigured: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  generatedQuestions?: ExamQuestion[];
  sourceLessonsUsed?: string[];
  error?: boolean;
}
