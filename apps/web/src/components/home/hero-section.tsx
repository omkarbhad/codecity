export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 text-center">
      {/* Radial glow behind hero */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="animate-fade-up">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary/70">
            Codebase Visualization Engine
          </p>
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl animate-fade-up delay-100">
          <span className="text-foreground">See Your Code</span>
          <br />
          <span className="text-primary text-glow-cyan">as a City</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground leading-relaxed animate-fade-up delay-200">
          Transform any TypeScript repository into an interactive 3D city.
          Dependencies become roads. Functions become floors. Complexity becomes height.
        </p>
      </div>

      {/* 3D Demo placeholder */}
      <div className="relative mx-auto mt-16 max-w-5xl px-6 animate-fade-up delay-300">
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm glow-cyan">
          {/* Animated grid inside */}
          <div className="absolute inset-0 bg-grid-fine animate-grid-scroll opacity-30" />

          {/* City silhouette placeholder */}
          <div className="absolute inset-0 flex items-end justify-center pb-12">
            <div className="flex items-end gap-1.5 opacity-20">
              {[40, 65, 30, 80, 50, 90, 35, 70, 45, 85, 55, 75, 40, 60, 95, 50, 70, 35, 80, 45].map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-t-sm bg-primary/60"
                  style={{ height: `${h * 2}px` }}
                />
              ))}
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-xs tracking-widest uppercase text-primary/50 animate-glow-pulse">
                Interactive 3D Visualization
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
