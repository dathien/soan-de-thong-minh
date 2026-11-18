import React, { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  FolderOpen,
  RotateCcw,
  Search,
  Shuffle,
  Star,
  Trash2,
} from 'lucide-react';
import { ExamDocument, ExamStatus } from '../types';
import { EXAM_TYPE_LABELS } from '../data/curriculum';
import { exportExamToWord } from '../services/wordExport';
import { useToast } from '../components/ToastProvider';

interface ExamVaultPageProps {
  exams: ExamDocument[];
  onOpenExam: (id: string) => void;
  onDuplicateExam: (exam: ExamDocument) => Promise<void>;
  onSaveExam: (exam: ExamDocument) => Promise<void>;
  onShuffleExam: (id: string) => void;
}

export const ExamVaultPage: React.FC<ExamVaultPageProps> = ({
  exams,
  onOpenExam,
  onDuplicateExam,
  onSaveExam,
  onShuffleExam,
}) => {
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | ExamStatus | 'favorite' | 'trash'>('all');
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams
      .filter((e) => {
        if (filterStatus === 'trash') return Boolean(e.isDeleted);
        if (e.isDeleted) return false;
        if (filterStatus === 'favorite') return Boolean(e.isFavorite);
        if (filterStatus !== 'all' && e.status !== filterStatus) return false;
        if (!q) return true;
        return `${e.title} ${e.code} ${e.subject} Lớp ${e.grade}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [exams, filterStatus, search]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-[#0F172A]">Kho đề kiểm tra</h1>
          <p className="text-base text-[#475569] mt-1">
            Quản lý các đề đang soạn, đề đã hoàn thành, nhân bản, xuất Word hoặc khôi phục từ thùng rác.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên đề, mã đề, môn..."
            className="w-full rounded-xl border border-[#CBD5E1] pl-10 pr-3.5 py-2 text-base"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'draft', label: 'Đang soạn' },
          { id: 'completed', label: 'Đã hoàn thành' },
          { id: 'approved', label: 'Đã duyệt' },
          { id: 'favorite', label: 'Yêu thích' },
          { id: 'trash', label: 'Thùng rác' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterStatus(t.id as typeof filterStatus)}
            className={`px-4 py-2 rounded-xl text-[15px] font-semibold transition-colors cursor-pointer ${
              filterStatus === t.id
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center text-base text-[#475569]">
          Không có đề kiểm tra nào trong mục này.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FB] text-[#475569]">
                <th className="py-3.5 px-4 font-semibold">TT</th>
                <th className="py-3.5 px-4 font-semibold">Tên đề kiểm tra</th>
                <th className="py-3.5 px-4 font-semibold">Môn / Lớp</th>
                <th className="py-3.5 px-4 font-semibold">Loại / Thời gian</th>
                <th className="py-3.5 px-4 font-semibold text-right">Câu / Điểm</th>
                <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                <th className="py-3.5 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono-tabular text-[#475569]">
                    #{ex.sequenceNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    {renamingId === ex.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="rounded-lg border border-[#2563EB] px-3 py-1.5 text-base"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await onSaveExam({
                              ...ex,
                              title: renameValue.trim() || ex.title,
                              header: { ...ex.header, examTitle: renameValue.trim() || ex.title },
                              updatedAt: new Date().toISOString(),
                            });
                            setRenamingId(null);
                          }}
                          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-[15px] font-semibold text-white cursor-pointer"
                        >
                          Lưu
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            onSaveExam({ ...ex, isFavorite: !ex.isFavorite, updatedAt: new Date().toISOString() })
                          }
                          className={`cursor-pointer ${ex.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                          title="Đánh dấu yêu thích"
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                        <div>
                          <div className="font-semibold text-base text-[#0F172A]">{ex.title}</div>
                          <div className="text-sm text-[#475569] font-mono-tabular">
                            {ex.code} · Nguồn: {ex.sourceRef.lessonIds.length} bài SGK
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A]">
                    {ex.subject} · Lớp {ex.grade}
                  </td>
                  <td className="py-3.5 px-4 text-[#475569]">
                    {EXAM_TYPE_LABELS[ex.examType]} · {ex.durationMinutes} phút
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-[#0F172A]">
                    {ex.questions.length} câu / {ex.totalPoints}đ
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={ex.status}
                      onChange={(e) =>
                        onSaveExam({
                          ...ex,
                          status: e.target.value as ExamStatus,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-sm font-medium"
                    >
                      <option value="draft">Đang soạn</option>
                      <option value="completed">Đã hoàn thành</option>
                      <option value="approved">Đã duyệt</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {!ex.isDeleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenExam(ex.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-[15px] font-semibold text-[#0F172A] hover:bg-slate-100 cursor-pointer"
                          title="Mở trong trình soạn thảo"
                        >
                          <FolderOpen className="w-4 h-4 text-[#2563EB]" />
                          Mở
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(ex.id);
                            setRenameValue(ex.title);
                          }}
                          className="rounded-lg p-2 text-[#475569] hover:bg-slate-100 cursor-pointer"
                          title="Đổi tên"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateExam(ex)}
                          className="rounded-lg p-2 text-[#475569] hover:bg-slate-100 cursor-pointer"
                          title="Nhân bản"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await exportExamToWord(ex, 'exam_with_answers');
                            toast.success(`Đã xuất Word cho "${ex.title}".`);
                          }}
                          className="rounded-lg p-2 text-[#475569] hover:bg-slate-100 cursor-pointer"
                          title="Tải Word"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onShuffleExam(ex.id)}
                          className="rounded-lg p-2 text-[#475569] hover:bg-slate-100 cursor-pointer"
                          title="Trộn đề"
                        >
                          <Shuffle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSaveExam({ ...ex, isDeleted: true, updatedAt: new Date().toISOString() })
                          }
                          className="rounded-lg p-2 text-[#DC2626] hover:bg-rose-50 cursor-pointer"
                          title="Chuyển vào thùng rác"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSaveExam({ ...ex, isDeleted: false, updatedAt: new Date().toISOString() })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#16A34A]/30 bg-emerald-50 px-3 py-1.5 text-[15px] font-semibold text-[#16A34A] hover:bg-emerald-100 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Khôi phục
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
