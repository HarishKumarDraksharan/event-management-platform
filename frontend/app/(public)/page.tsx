import { AboutUsSection } from "../../components/about-us-section";
import { HeroCarousel } from "../../components/hero-carousel";
import { HomepageServicesSection } from "../../components/homepage-services-section";
import { HomepageWhyChooseUsSection } from "../../components/homepage-why-choose-us-section";
import { HomepageGallerySection } from "../../components/homepage-gallery-section";
import { HomepageTestimonialsSection } from "../../components/homepage-testimonials-section";
import { getPublicAboutUs, getPublicHeroSlides, getPublicHomepageGallery, getPublicHomepageServices, getPublicHomepageTestimonials, getPublicHomepageWhyChooseUs, getPublicServices } from "../../lib/public-content";

export default async function Home() {
  const [heroSlides, aboutUs, homepageServices, services, whyChooseUs, gallery, testimonials] = await Promise.all([
    getPublicHeroSlides(),
    getPublicAboutUs(),
    getPublicHomepageServices(),
    getPublicServices(),
    getPublicHomepageWhyChooseUs(),
    getPublicHomepageGallery(),
    getPublicHomepageTestimonials(),
  ]);
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />
      <AboutUsSection content={aboutUs} />
      <HomepageServicesSection section={homepageServices} services={services} />
      <HomepageWhyChooseUsSection section={whyChooseUs} />
      <HomepageGallerySection gallery={gallery} />
      <HomepageTestimonialsSection section={testimonials} />
    </main>
  );
}
