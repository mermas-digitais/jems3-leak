import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

type StatCardProps = {
  label: string;
  value: string;
  helpText?: string;
  badge?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  helpText,
  badge,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-[#dfe5df]/80 bg-white/85 dark:border-[#24312b] dark:bg-[#111815]",
        className,
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
            {label}
          </p>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        <div className="space-y-1">
          <p className="font-serif text-4xl leading-none text-[#0f172a] dark:text-[#f5f7f4]">
            {value}
          </p>
          {helpText ? (
            <p className="text-sm leading-6 text-[#66736d] dark:text-[#98a59d]">
              {helpText}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
