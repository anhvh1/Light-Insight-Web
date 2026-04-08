import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  X, 
  ImageIcon,
  Maximize,
  Palette,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadWizardProps {
  onConfirm: (file: File) => void;
  onCancel: () => void;
  isUploading: boolean;
}

interface ValidationResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  isLoading: boolean;
}

export function ImageUploadWizard({ onConfirm, onCancel, isUploading }: ImageUploadWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checks, setChecks] = useState<ValidationResult[]>([
    { id: 'size', label: 'Dung lượng file', passed: false, message: 'Đang kiểm tra...', isLoading: false },
    { id: 'dim', label: 'Kích thước chuẩn', passed: false, message: 'Đang kiểm tra...', isLoading: false },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      runValidations(selectedFile, url);
    }
  };

  const updateCheck = (id: string, updates: Partial<ValidationResult>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const runValidations = async (imgFile: File, url: string) => {
    // 1. Reset Loading States
    setChecks(prev => prev.map(c => ({ ...c, isLoading: true })));

    // --- 1. File Size Check ---
    const sizeInMB = imgFile.size / 1024 / 1024;
    const sizePassed = sizeInMB < 10;
    updateCheck('size', {
      passed: sizePassed,
      isLoading: false,
      message: sizePassed 
        ? `Hợp lệ (${sizeInMB.toFixed(2)} MB)`
        : `Vượt quá giới hạn (Hiện tại: ${sizeInMB.toFixed(2)} MB / Tối đa: 10 MB)`
    });

    const img = new Image();
    img.src = url;

    img.onload = () => {
      // --- 2. Dimensions Check (2912x1472 ±100) ---
      const idealW = 2912;
      const idealH = 1472;
      const margin = 100;
      
      const widthPassed = Math.abs(img.naturalWidth - idealW) <= margin;
      const heightPassed = Math.abs(img.naturalHeight - idealH) <= margin;
      const dimPassed = widthPassed && heightPassed;
      
      updateCheck('dim', {
        passed: dimPassed,
        isLoading: false,
        message: dimPassed 
          ? `Kích thước phù hợp (${img.naturalWidth}x${img.naturalHeight}px)`
          : `Khuyến nghị ${idealW}x${idealH}px (Hiện tại: ${img.naturalWidth}x${img.naturalHeight}px)`
      });
    };
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onCancel} />
      
      <div className="relative w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-psim-orange/20 flex items-center justify-center text-psim-orange">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-white uppercase tracking-tight">Tải bản đồ chuyên nghiệp</h3>
              <p className="text-[11px] text-t-2">Kiểm tra tiêu chuẩn hình ảnh trước khi lưu.</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-t-2 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col md:flex-row gap-8 overflow-y-auto max-h-[70vh]">
          {/* Left: Preview & Instructions */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="aspect-[880/450] bg-black/40 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center overflow-hidden relative group">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <ImageIcon size={48} />
                    <span className="text-[11px] uppercase tracking-widest font-bold">Chưa chọn ảnh</span>
                  </div>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-psim-orange text-white flex items-center justify-center shadow-lg">
                    <Upload size={24} />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase">{previewUrl ? 'Thay đổi ảnh' : 'Chọn ảnh'}</span>
                </button>
              </div>
              {file && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] text-t-2 font-mono truncate max-w-[200px]">{file.name}</span>
                  <span className="text-[10px] text-psim-orange font-bold uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>

            {/* General Recommendations Text Moved to Left Column */}
            <div className="flex flex-col gap-3 p-5 rounded-xl bg-psim-orange/5 border border-psim-orange/10">
              <h5 className="text-[10px] font-black text-psim-orange uppercase tracking-[0.15em] flex items-center gap-2 mb-1">
                <Palette size={14} /> Hướng dẫn tối ưu bản đồ
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="text-[10px] text-t-2 leading-relaxed flex gap-2">
                  <span className="text-psim-orange font-bold">01.</span>
                  <span>Dung lượng file nên <strong className="text-t-1">nhỏ hơn 10MB</strong> để đảm bảo tốc độ tải và xử lý mượt mà.</span>
                </div>
                <div className="text-[10px] text-t-2 leading-relaxed flex gap-2">
                  <span className="text-psim-orange font-bold">02.</span>
                  <span>Kích thước khuyến nghị <strong className="text-t-1">2912x1472px</strong> (±100px) để hiển thị sắc nét nhất.</span>
                </div>
                <div className="text-[10px] text-t-2 leading-relaxed flex gap-2">
                  <span className="text-psim-orange font-bold">03.</span>
                  <span>Sử dụng định dạng <strong className="text-t-1">JPG hoặc PNG</strong> chất lượng cao để tránh vỡ nét khi Zoom.</span>
                </div>
                <div className="text-[10px] text-t-2 leading-relaxed flex gap-2">
                  <span className="text-psim-orange font-bold">04.</span>
                  <span>Ưu tiên sử dụng <strong className="text-t-1">tông màu nền tối</strong> để các biểu tượng và cảnh báo hiển thị nổi bật nhất.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Analysis Only */}
          <div className="w-full md:w-[280px] flex flex-col gap-6">
            <h4 className="text-[10px] font-black text-t-2 uppercase tracking-[0.2em] border-l-2 border-psim-orange pl-3">Phân tích tiêu chuẩn</h4>
            
            <div className="flex flex-col gap-4">
              {checks.map(check => (
                <div key={check.id} className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-t-1">{check.label}</span>
                    {check.isLoading ? (
                      <RefreshCcw size={14} className="animate-spin text-psim-orange" />
                    ) : check.passed ? (
                      <CheckCircle2 size={18} className="text-psim-green" />
                    ) : (
                      <AlertTriangle size={18} className="text-psim-orange" />
                    )}
                  </div>
                  <p className={cn(
                    "text-[10px] leading-relaxed",
                    check.passed ? "text-t-2" : "text-psim-orange/80"
                  )}>
                    {check.message}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-auto p-4 rounded-xl bg-white/[0.02] border border-white/5 border-dashed">
              <p className="text-[9px] text-t-3 leading-relaxed italic text-center">
                * Lưu ý: Các cảnh báo trên mang tính chất khuyến nghị để đạt hiệu quả thẩm mỹ tốt nhất.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl text-[12px] font-bold text-t-2 uppercase border border-white/10 hover:bg-white/5 transition-all"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={() => file && onConfirm(file)}
            disabled={!file || isUploading}
            className="flex-[2] h-12 bg-psim-orange text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-psim-orange/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
          >
            {isUploading ? <RefreshCcw size={16} className="animate-spin" /> : <Upload size={16} />}
            Lưu và tải lên bản đồ
          </button>
        </div>
      </div>
    </div>
  );
}

// Icon helper
function RefreshCcw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
