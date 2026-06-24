type Props = {
  title: string
  children: React.ReactNode
}

export function PsmSectionBlock({ title, children }: Props) {
  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-mauve-300">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
