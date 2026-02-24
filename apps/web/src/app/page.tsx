import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { RepoInput } from "@/components/home/repo-input"
import { FeatureCards } from "@/components/home/feature-cards"
import { Footer } from "@/components/home/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <RepoInput />
        <FeatureCards />
      </main>
      <Footer />
    </>
  )
}
