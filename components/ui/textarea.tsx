import * as React from "react";

import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-32 w-full rounded-2xl border border-[#d4dad4] bg-white/90 px-4 py-3 text-sm text-[#111827] shadow-sm transition-colors placeholder:text-[#87938d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4a3b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#25312b] dark:bg-[#0b0f0d]/80 dark:text-[#f5f7f4] dark:placeholder:text-[#6f7b75]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
