type Props = {
  title: string
  children: React.ReactNode
}

export function PsmSectionBlock({ title, children }: Props) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-mauve-700 dark:text-mauve-300">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
