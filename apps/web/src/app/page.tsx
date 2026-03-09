import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { Features } from "@/components/home/features"
import { HowItWorks } from "@/components/home/how-it-works"
import { CTA } from "@/components/home/cta"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
