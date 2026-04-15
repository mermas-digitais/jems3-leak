import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[#e8ede8] dark:bg-[#1a221e]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
