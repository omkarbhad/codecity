import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { RepoInput } from "@/components/home/repo-input"
import { HowItWorks } from "@/components/home/how-it-works"
import { FeatureCards } from "@/components/home/feature-cards"
import { SocialProof } from "@/components/home/social-proof"
import { CtaSection } from "@/components/home/cta-section"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-shell">
        <main>
          <HeroSection />
          <RepoInput />
          <HowItWorks />
          <FeatureCards />
          <SocialProof />
          <CtaSection />
        </main>
      </div>
      <Footer />
    </>
  )
}
