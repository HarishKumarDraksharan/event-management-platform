import { AboutUsSection } from "../../components/about-us-section";
import { HeroCarousel } from "../../components/hero-carousel";
import { getPublicAboutUs, getPublicHeroSlides } from "../../lib/public-content";

export default async function Home() {
  const [heroSlides, aboutUs] = await Promise.all([getPublicHeroSlides(), getPublicAboutUs()]);
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />
      <AboutUsSection content={aboutUs} />
    </main>
  );
}
