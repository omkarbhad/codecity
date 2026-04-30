const useCases = [
  {
    title: "Onboarding",
    description:
      "Give a new engineer a shape of the codebase before they start jumping between folders.",
  },
  {
    title: "Technical debt",
    description:
      "Large towers and dense districts make oversized files and crowded modules easier to spot.",
  },
  {
    title: "Architecture reviews",
    description:
      "Use a shared visual map instead of screenshots of nested folders and hand-drawn diagrams.",
  },
  {
    title: "Repository comparison",
    description:
      "Revisit projects over time and compare how services or modules change as the product grows.",
  },
]

const languages = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "Kotlin",
  "Ruby",
  "PHP",
  "Swift",
  "CSS",
  "HTML",
  "JSON",
  "YAML",
  "Markdown",
  "Zig",
]

export function WhyCodeCity() {
  return (
    <section className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">Why a City Map Helps</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            File trees are precise, but they are not good at scale. CodeCity gives
            teams a spatial overview before they move into source-level inspection.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="rounded-lg border border-white/[0.08] bg-[#0f0f10] p-5">
              <h3 className="text-sm font-semibold text-zinc-100">{useCase.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{useCase.description}</p>
            </article>
          ))}
        </div>

        <div className="lg:col-start-2">
          <div className="rounded-lg border border-white/[0.08] bg-[#0f0f10] p-5">
            <h3 className="text-sm font-semibold text-zinc-100">Language coverage</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              CodeCity parses common application languages and assigns them readable districts.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {languages.map((language) => (
                <span key={language} className="rounded-md border border-white/[0.08] px-2 py-1 text-xs text-zinc-400">
                  {language}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
