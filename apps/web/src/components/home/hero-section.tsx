export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 text-center">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Visualize Your Codebase
          <br />
          <span className="text-primary">as a City</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Transform any TypeScript repository into an interactive 3D city.
          See dependencies as roads, functions as floors, and complexity as height.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-5xl px-6">
        <div className="aspect-video rounded-xl border border-border bg-card/50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl">🏙️</div>
            <p className="mt-2 text-muted-foreground">3D City Demo</p>
            <p className="text-xs text-muted-foreground/60">Interactive R3F scene coming soon</p>
          </div>
        </div>
      </div>
    </section>
  )
}
