import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f4a3b] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-white dark:ring-offset-[#0b0f0d]",
  {
    variants: {
      variant: {
        default:
          "bg-[#0f172a] text-white hover:bg-[#111f3d] dark:bg-[#e5e7eb] dark:text-[#0b0f0d] dark:hover:bg-white",
        secondary:
          "bg-[#e7ece7] text-[#111827] hover:bg-[#dbe4dc] dark:bg-[#18201d] dark:text-[#f3f4f6] dark:hover:bg-[#202925]",
        outline:
          "border border-[#d3d8d2] bg-transparent text-[#111827] hover:bg-[#f4f7f4] dark:border-[#25302b] dark:text-[#f3f4f6] dark:hover:bg-[#16201c]",
        ghost:
          "text-[#111827] hover:bg-[#eef2ef] dark:text-[#f3f4f6] dark:hover:bg-[#16201c]",
        destructive: "bg-[#991b1b] text-white hover:bg-[#7f1d1d]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
