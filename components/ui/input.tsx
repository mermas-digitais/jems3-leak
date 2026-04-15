import * as React from "react";

import { cn } from "../../lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-[#d4dad4] bg-white/90 px-4 py-2 text-sm text-[#111827] shadow-sm transition-colors placeholder:text-[#87938d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4a3b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#25312b] dark:bg-[#0b0f0d]/80 dark:text-[#f5f7f4] dark:placeholder:text-[#6f7b75]",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
