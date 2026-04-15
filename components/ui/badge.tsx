import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#e9efe9] text-[#193125] dark:bg-[#17201b] dark:text-[#d7e0da]",
        secondary:
          "border-transparent bg-[#eef2ff] text-[#1e293b] dark:bg-[#182030] dark:text-[#dbe2f3]",
        outline:
          "border-[#ced7cf] text-[#111827] dark:border-[#24312b] dark:text-[#f3f4f6]",
        accent:
          "border-transparent bg-[#d9f0e1] text-[#0f3d27] dark:bg-[#1d3328] dark:text-[#b9f0cd]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
