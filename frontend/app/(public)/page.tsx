import { AboutUsSection } from "../../components/about-us-section";
import { HeroCarousel } from "../../components/hero-carousel";
import { HomepageServicesSection } from "../../components/homepage-services-section";
import { getPublicAboutUs, getPublicHeroSlides, getPublicHomepageServices, getPublicServices } from "../../lib/public-content";

export default async function Home() {
  const [heroSlides, aboutUs, homepageServices, services] = await Promise.all([
    getPublicHeroSlides(),
    getPublicAboutUs(),
    getPublicHomepageServices(),
    getPublicServices(),
  ]);
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />
      <AboutUsSection content={aboutUs} />
      <HomepageServicesSection section={homepageServices} services={services} />
    </main>
  );
}
