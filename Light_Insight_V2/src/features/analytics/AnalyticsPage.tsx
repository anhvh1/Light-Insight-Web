import { UnderConstruction } from "@/components/ui/under-construction";

export function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-3 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          Analytics
        </h1>
      </header>
      <div className="flex-1 bg-bg-0 flex flex-col p-6 h-full overflow-hidden">
        <UnderConstruction title="Analytics" />
      </div>
    </div>
  );
}
