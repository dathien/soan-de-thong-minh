import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-4 min-h-[44px] text-[15px] font-semibold text-[#1E40AF] hover:bg-[#DBEAFE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Cài đặt ứng dụng
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 min-h-[44px] text-[15px] font-medium text-[#0F172A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-[#2563EB]" />
          Cài đặt iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#0F172A]">
                Cài đặt trên iPhone / iPad
              </h3>
              <ol className="mt-3 space-y-2 text-base text-[#475569] list-decimal list-inside leading-relaxed">
                <li>
                  Chạm vào nút <strong>Chia sẻ</strong> trên thanh công cụ trình duyệt Safari.
                </li>
                <li>
                  Cuộn xuống và chọn <strong>Thêm vào Màn hình chính</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#2563EB] py-3 text-base font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
