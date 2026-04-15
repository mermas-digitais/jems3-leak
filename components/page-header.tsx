import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "./ui/badge";
import { buttonVariants, Button } from "./ui/button";

type PageHeaderProps = {
  badge: string;
  title: string;
  description: string;
  primaryAction?: string;
  primaryActionHref?: string;
  secondaryAction?: string;
  secondaryActionHref?: string;
};

export function PageHeader({
  badge,
  title,
  description,
  primaryAction,
  primaryActionHref,
  secondaryAction,
  secondaryActionHref,
}: PageHeaderProps) {
  return (
    <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div className="space-y-5">
        <Badge variant="accent" className="w-fit">
          {badge}
        </Badge>
        <div className="space-y-3">
          <h1 className="max-w-4xl font-serif text-3xl leading-[1.02] tracking-tight text-[#0f172a] dark:text-[#f5f7f4] md:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-[#4b5a53] dark:text-[#aab4ae] md:text-lg">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 lg:justify-end">
        {primaryAction ? (
          primaryActionHref ? (
            <Link className={buttonVariants()} href={primaryActionHref}>
              {primaryAction}
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <Button>
              {primaryAction}
              <ChevronRight className="size-4" />
            </Button>
          )
        ) : null}
        {secondaryAction ? (
          secondaryActionHref ? (
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={secondaryActionHref}
            >
              {secondaryAction}
            </Link>
          ) : (
            <Button variant="outline">{secondaryAction}</Button>
          )
        ) : null}
      </div>
    </header>
  );
}
