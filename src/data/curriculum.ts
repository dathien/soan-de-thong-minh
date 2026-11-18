import { CognitiveLevel, ExamType, QuestionType } from '../types';

export const TEXTBOOK_SERIES = [
  'Kết nối tri thức với cuộc sống',
  'Chân trời sáng tạo (dự phòng mở rộng)',
  'Cánh diều (dự phòng mở rộng)',
];

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function getSubjectsForGrade(grade: number): string[] {
  if (grade >= 1 && grade <= 2) {
    return [
      'Toán',
      'Tiếng Việt',
      'Tự nhiên và Xã hội',
      'Đạo đức',
      'Âm nhạc',
      'Mĩ thuật',
      'Giáo dục thể chất',
      'Hoạt động trải nghiệm',
    ];
  }
  if (grade === 3) {
    return [
      'Toán',
      'Tiếng Việt',
      'Tiếng Anh',
      'Tự nhiên và Xã hội',
      'Tin học và Công nghệ',
      'Đạo đức',
      'Âm nhạc',
      'Mĩ thuật',
      'Giáo dục thể chất',
      'Hoạt động trải nghiệm',
    ];
  }
  if (grade >= 4 && grade <= 5) {
    return [
      'Toán',
      'Tiếng Việt',
      'Tiếng Anh',
      'Khoa học',
      'Lịch sử và Địa lí',
      'Tin học và Công nghệ',
      'Đạo đức',
      'Âm nhạc',
      'Mĩ thuật',
      'Giáo dục thể chất',
      'Hoạt động trải nghiệm',
    ];
  }
  if (grade >= 6 && grade <= 9) {
    return [
      'Toán',
      'Ngữ văn',
      'Tiếng Anh',
      'Khoa học tự nhiên',
      'Lịch sử và Địa lí',
      'Tin học',
      'Công nghệ',
      'Giáo dục công dân',
      'Nghệ thuật',
      'Giáo dục thể chất',
      'Hoạt động trải nghiệm, hướng nghiệp',
    ];
  }
  // Lớp 10 - 12 (THPT)
  return [
    'Toán',
    'Ngữ văn',
    'Tiếng Anh',
    'Vật lí',
    'Hóa học',
    'Sinh học',
    'Tin học',
    'Công nghệ',
    'Lịch sử',
    'Địa lí',
    'Giáo dục kinh tế và pháp luật',
    'Giáo dục quốc phòng và an ninh',
    'Hoạt động trải nghiệm, hướng nghiệp',
  ];
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  regular: 'Kiểm tra thường xuyên',
  '10min': 'Kiểm tra 10 phút',
  '15min': 'Kiểm tra 15 phút',
  '45min': 'Kiểm tra 1 tiết (45 phút)',
  midterm: 'Kiểm tra giữa kì',
  final: 'Kiểm tra cuối kì',
  review: 'Đề ôn tập',
  thpt_grad: 'Đề luyện thi tốt nghiệp THPT',
  gifted: 'Đề học sinh giỏi',
  homework: 'Bài tập về nhà',
  worksheet: 'Phiếu học tập',
  chapter_practice: 'Bài tập theo chương',
  topic_practice: 'Bài tập theo chuyên đề',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Trắc nghiệm nhiều lựa chọn',
  true_false: 'Trắc nghiệm Đúng/Sai (4 ý)',
  short_answer: 'Trắc nghiệm trả lời ngắn',
  essay: 'Tự luận',
  fill_blank: 'Điền khuyết',
  matching: 'Ghép nối',
  ordering: 'Sắp xếp',
  reading_comprehension: 'Câu hỏi đọc hiểu',
  practical: 'Câu hỏi thực hành',
};

export const COGNITIVE_LEVEL_LABELS: Record<CognitiveLevel, string> = {
  NB: 'Nhận biết',
  TH: 'Thông hiểu',
  VD: 'Vận dụng',
  VDC: 'Vận dụng cao',
};

export const DEFAULT_EXAM_DURATION: Record<ExamType, number> = {
  regular: 15,
  '10min': 10,
  '15min': 15,
  '45min': 45,
  midterm: 60,
  final: 90,
  review: 45,
  thpt_grad: 90,
  gifted: 150,
  homework: 30,
  worksheet: 20,
  chapter_practice: 45,
  topic_practice: 45,
};
