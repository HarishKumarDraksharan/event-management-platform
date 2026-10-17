import { AboutUsSection } from "../../components/about-us-section";
import { HeroCarousel } from "../../components/hero-carousel";
import { HomepageServicesSection } from "../../components/homepage-services-section";
import { HomepageWhyChooseUsSection } from "../../components/homepage-why-choose-us-section";
import { HomepageGallerySection } from "../../components/homepage-gallery-section";
import { getPublicAboutUs, getPublicHeroSlides, getPublicHomepageGallery, getPublicHomepageServices, getPublicHomepageWhyChooseUs, getPublicServices } from "../../lib/public-content";

export default async function Home() {
  const [heroSlides, aboutUs, homepageServices, services, whyChooseUs, gallery] = await Promise.all([
    getPublicHeroSlides(),
    getPublicAboutUs(),
    getPublicHomepageServices(),
    getPublicServices(),
    getPublicHomepageWhyChooseUs(),
    getPublicHomepageGallery(),
  ]);
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />
      <AboutUsSection content={aboutUs} />
      <HomepageServicesSection section={homepageServices} services={services} />
      <HomepageWhyChooseUsSection section={whyChooseUs} />
      <HomepageGallerySection gallery={gallery} />
    </main>
  );
}
