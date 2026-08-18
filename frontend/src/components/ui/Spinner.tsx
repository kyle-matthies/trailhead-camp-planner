import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-6 h-6 animate-spin text-forest-600", className)} />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
