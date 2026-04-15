import Link from "next/link";

import { cn } from "../lib/utils";
import { buttonVariants, Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "border-dashed border-[#cfd8cf] bg-white/80 shadow-none dark:border-[#24312b] dark:bg-[#111815]",
        className,
      )}
    >
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
            {title}
          </h3>
          <p className="max-w-xl text-sm leading-6 text-[#5f6d67] dark:text-[#aab4ae]">
            {description}
          </p>
        </div>
        {actionLabel ? (
          actionHref ? (
            <Link
              className={buttonVariants({ variant: "secondary" })}
              href={actionHref}
            >
              {actionLabel}
            </Link>
          ) : actionOnClick ? (
            <Button variant="secondary" onClick={actionOnClick}>
              {actionLabel}
            </Button>
          ) : (
            <Button variant="secondary">{actionLabel}</Button>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
