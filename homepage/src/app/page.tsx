import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { Features } from "@/components/home/features"
import { WhyCodeCity } from "@/components/home/why-codecity"
import { HowItWorks } from "@/components/home/how-it-works"
import { ExploreSection } from "@/components/home/explore-section"
import { Downloads } from "@/components/home/downloads"
import { CTA } from "@/components/home/cta"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CodeCity",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Windows, Linux",
    description:
      "CodeCity turns GitHub repositories into navigable 3D maps for architecture review and codebase exploration.",
    url: "https://codecity.app",
    author: {
      "@type": "Person",
      name: "Omkar Bhad",
    },
    codeRepository: "https://github.com/omkarbhad/codecity",
    license: "https://github.com/omkarbhad/codecity/blob/main/LICENSE",
  }

  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main>
        <HeroSection />
        <Features />
        <WhyCodeCity />
        <HowItWorks />
        <ExploreSection />
        <Downloads />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
