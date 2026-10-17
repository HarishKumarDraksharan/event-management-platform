import { AboutUsSection } from "../../components/about-us-section";
import { HeroCarousel } from "../../components/hero-carousel";
import { HomepageServicesSection } from "../../components/homepage-services-section";
import { HomepageWhyChooseUsSection } from "../../components/homepage-why-choose-us-section";
import { getPublicAboutUs, getPublicHeroSlides, getPublicHomepageServices, getPublicHomepageWhyChooseUs, getPublicServices } from "../../lib/public-content";

export default async function Home() {
  const [heroSlides, aboutUs, homepageServices, services, whyChooseUs] = await Promise.all([
    getPublicHeroSlides(),
    getPublicAboutUs(),
    getPublicHomepageServices(),
    getPublicServices(),
    getPublicHomepageWhyChooseUs(),
  ]);
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />
      <AboutUsSection content={aboutUs} />
      <HomepageServicesSection section={homepageServices} services={services} />
      <HomepageWhyChooseUsSection section={whyChooseUs} />
    </main>
  );
}
