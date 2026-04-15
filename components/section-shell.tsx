import { cn } from "../lib/utils";

type SectionShellProps = React.HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionShell({
  eyebrow,
  title,
  description,
  className,
  children,
  ...props
}: SectionShellProps) {
  return (
    <section className={cn("space-y-5", className)} {...props}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5f6f65] dark:text-[#98a59d]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-serif text-3xl leading-tight text-[#0f172a] dark:text-[#f5f7f4] md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-[#51605a] dark:text-[#a7b0ab]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
