import { UnderConstruction } from "@/components/ui/under-construction";

export function SystemHealthPage() {
  return (
    <div className="flex-1 bg-bg-0 flex flex-col p-6 h-full overflow-hidden">
      <h1 className="text-xl font-bold mb-6">System Health</h1>
      <UnderConstruction title="System Health" />
    </div>
  );
}
