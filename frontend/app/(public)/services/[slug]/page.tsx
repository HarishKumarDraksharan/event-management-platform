import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicServices } from "../../../../lib/public-content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const services = await getPublicServices();
  const service = services?.find((item) => item.slug === slug);
  return service ? { title: service.title, description: service.description } : {};
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const services = await getPublicServices();
  const service = services?.find((item) => item.slug === slug);
  if (!services || !service) notFound();
  const eventTypes: Record<string, string> = { weddings: "Wedding", "corporate-events": "Corporate event", birthdays: "Birthday", "private-celebrations": "Private celebration" };
  return <main id="main-content"><section className="page-hero service-hero"><p className="eyebrow">TSG EVENTS · SERVICES</p><p className="eyebrow service-kicker">{service.kicker}</p><h1>{service.title},<br /><em>thoughtfully planned.</em></h1><p className="hero-intro">{service.description}</p><Link className="button button-dark" href={`/contact?eventType=${encodeURIComponent(eventTypes[service.slug] ?? "Private celebration")}`}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link></section><section className="service-detail section-wrap"><p className="eyebrow">A THOUGHTFUL START</p><h2>Room to plan<br /><em>around what matters.</em></h2><p>{service.detail}</p><Link className="text-link" href="/contact">Start an enquiry <span aria-hidden="true">↗</span></Link></section><section className="other-services"><p className="eyebrow">MORE WAYS TO GATHER</p><div>{services.filter((item) => item.slug !== slug).map((item) => <Link className="text-link" key={item.id} href={`/services/${item.slug}`}>{item.title} <span aria-hidden="true">↗</span></Link>)}</div></section></main>;
}
