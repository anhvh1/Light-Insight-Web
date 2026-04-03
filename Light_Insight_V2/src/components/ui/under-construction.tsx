import { Zap } from 'lucide-react';

interface UnderConstructionProps {
  title: string;
}

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] opacity-20 gap-4">
      <Zap size={48} />
      <div className="text-center">
        <h3 className="text-[14px] font-bold uppercase tracking-widest">Under Construction</h3>
        <p className="text-[11px] mt-1">Mục "{title}" đang được phát triển</p>
      </div>
    </div>
  );
}
