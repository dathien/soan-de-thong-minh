# SOẠN ĐỀ THÔNG MINH AI

**Slogan:** Sát kiến thức – Chuẩn cấu trúc – Tiết kiệm thời gian.

Ứng dụng web hỗ trợ giáo viên phổ thông Việt Nam (từ Tiểu học đến THPT) xây dựng đề kiểm tra, ma trận, bảng đặc tả, ngân hàng câu hỏi, trộn nhiều mã đề, phiếu trả lời trắc nghiệm và xuất tệp Word (`.docx` kèm công thức toán học OMML) / PDF bám sát chương trình Giáo dục phổ thông 2018 và bộ sách **Kết nối tri thức với cuộc sống**.

## Tính năng chính

1. **Trang chủ & Điều hướng 12 phân hệ liên kết dữ liệu:** Không tự động chuyển hướng sang màn hình kỹ thuật; hỗ trợ truy cập nhanh vào trình soạn đề, kho SGK, ma trận, bảng đặc tả, ngân hàng câu hỏi, kho đề, trộn đề và phiếu trả lời.
2. **Kho kiến thức SGK & Chọn tài liệu làm nguồn:** Tổ chức theo cấu trúc *Bộ sách → Khối lớp → Môn học (thay đổi động theo lớp) → Tập sách → Chương/Chủ đề → Bài học → Mục kiến thức*. Hỗ trợ checkbox 3 trạng thái, xem trước nội dung chi tiết, tải lên tài liệu cá nhân (`DOCX`, `PDF`, `XLSX`, `TXT`, `JPG/PNG`) và công cụ quản trị xác minh dữ liệu.
3. **Trình soạn thảo đề kiểm tra 3 cột khổ A4 (Times New Roman 13pt):**
   - Cột trái: Thiết lập nhanh cấu hình đề, mẫu đề thi tốt nghiệp THPT từ năm 2025 theo từng môn, mục lục câu hỏi.
   - Cột giữa: Vùng soạn thảo trực tiếp khổ giấy A4, chỉnh sửa câu hỏi tại chỗ, hiển thị công thức KaTeX.
   - Cột phải: Trợ lý AI bám sát nguồn SGK (RAG qua backend `/api/ai/*`), Trình soạn công thức trực quan, Kho hình khoa học SVG (đồ thị hàm số vẽ từ biểu thức thực tế, bảng biến thiên, hình học, mạch điện, quang học, thí nghiệm hóa học).
4. **Ma trận & Bảng đặc tả:** Đồng bộ hai chiều giữa Ma trận ↔ Bảng đặc tả ↔ Đề kiểm tra; xuất Word, Excel, PDF.
5. **Trộn đề & Phiếu trả lời:** Trộn nhiều mã đề (`101, 102, 103, 104...`) giữ nguyên câu khóa, nhóm đọc hiểu và phương án phụ thuộc thứ tự; xuất trọn bộ ZIP kèm bảng ánh xạ đáp án; in phiếu trả lời khổ A4 hoặc ghép 2 phiếu A5 trên A4.
6. **Lưu trữ ngoại tuyến & PWA:** Tự động lưu bản nháp vào `IndexedDB`, sao lưu/khôi phục JSON, cài đặt như ứng dụng độc lập (PWA).

## Cài đặt và chạy cục bộ

```bash
npm install
cp .env.example .env
# Cấu hình GEMINI_API_KEY trong file .env (chỉ chạy phía server, không lộ ra frontend)
npm run dev
```

Truy cập ứng dụng tại `http://localhost:3000`.

## Kiểm tra build & triển khai (Google AI Studio → GitHub → Vercel)

```bash
npm run lint
npm run build
```

Khi triển khai lên Vercel hoặc môi trường Node.js:
- Thiết lập biến môi trường `GEMINI_API_KEY` trong bảng Environment Variables của nền tảng.
- Không đưa API key vào các biến có tiền tố `VITE_`.

---
Copyright © 2026 – Phát triển bởi Thầy Hồ Nguyễn Đa Thiện.
