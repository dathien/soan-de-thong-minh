import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { UserDocument } from '../types';

// Configure pdf.js worker cleanly for Vite
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback handled at extraction time if worker unavailable
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

export function detectFileType(fileName: string): UserDocument['fileType'] | null {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'docx') return 'docx';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt' || ext === 'md' || ext === 'csv') return 'txt';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'image';
  return null;
}

export async function parseUploadedDocument(
  file: File,
  category: UserDocument['category'],
  subject?: string,
  grade?: number
): Promise<UserDocument> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Dung lượng tệp vượt quá giới hạn 15 MB. Vui lòng chọn tệp nhỏ hơn.');
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    throw new Error('Định dạng tệp chưa được hỗ trợ. Hỗ trợ: DOCX, PDF, TXT, XLSX, JPG, PNG.');
  }

  let extractedText = '';
  let warningNote: string | undefined;

  if (fileType === 'txt') {
    extractedText = await file.text();
  } else if (fileType === 'docx') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    extractedText = result.value.trim();
    if (!extractedText) {
      warningNote = 'Không tìm thấy văn bản thuần trong tệp DOCX (có thể nội dung nằm trong ảnh scan).';
    }
  } else if (fileType === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        parts.push(`[Trang tính: ${sheetName}]\n${csv.trim()}`);
      }
    }
    extractedText = parts.join('\n\n');
    if (!extractedText) {
      warningNote = 'Tệp Excel trống hoặc không có dữ liệu bảng.';
    }
  } else if (fileType === 'pdf') {
    const buffer = await file.arrayBuffer();
    try {
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const line = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (line) pageTexts.push(`[Trang ${i}] ${line}`);
      }
      extractedText = pageTexts.join('\n\n');
      if (!extractedText.trim()) {
        warningNote =
          'Tệp PDF này có thể là bản scan dạng hình ảnh nên không trích xuất được lớp chữ. Vui lòng kiểm tra và nhập bổ sung văn bản nếu cần dùng làm nguồn.';
      }
    } catch (err) {
      throw new Error(
        `Không thể đọc tệp PDF: ${err instanceof Error ? err.message : 'Lỗi giải mã PDF'}`
      );
    }
  } else if (fileType === 'image') {
    extractedText = '';
    warningNote =
      'Tệp hình ảnh đã được lưu trữ. Vì ảnh scan chưa qua nhận dạng OCR tự động, vui lòng tự kiểm tra hoặc dán phần nội dung chữ cần đối chiếu vào mô tả tài liệu.';
  }

  const now = new Date().toISOString();
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    fileType,
    category,
    subject,
    grade,
    extractedText,
    warningNote,
    fileSizeBytes: file.size,
    createdAt: now,
    updatedAt: now,
  };
}
