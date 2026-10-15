import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const services = {
  weddings: { title: "Weddings", kicker: "A DAY THAT FEELS LIKE YOU", description: "From the first shared idea to the final farewell, we can help shape a wedding celebration around what matters most to you.", detail: "Planning support can include finding a direction, coordinating the details, and keeping the day moving with care. The right scope starts with your plans, priorities and place." },
  "corporate-events": { title: "Corporate events", kicker: "GATHER WITH PURPOSE", description: "Bring people together around an idea, a milestone or simply the value of being in the same room.", detail: "From company gatherings to team celebrations, we can help coordinate a clear, considered experience. Share what the event needs to do, and we can begin there." },
  birthdays: { title: "Birthdays", kicker: "MAKE THEIR DAY THEIR OWN", description: "A birthday can be grand or easy-going, a surprise or a long-awaited reunion. Let the person being celebrated set the tone.", detail: "We can help bring the setting, schedule and personal touches into one thoughtful plan, shaped around the guest of honour and the people they love." },
  "private-celebrations": { title: "Private celebrations", kicker: "FOR THE MOMENTS THAT BRING YOU TOGETHER", description: "Mark a milestone, welcome a new chapter or gather your favourite people just because.", detail: "Every private celebration has its own shape. Tell us about the occasion, the people and the feeling you have in mind, and we can explore a plan together." },
} as const;

type ServiceSlug = keyof typeof services;
export function generateStaticParams() { return Object.keys(services).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = services[slug as ServiceSlug];
  return service ? { title: service.title, description: service.description } : {};
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = services[slug as ServiceSlug];
  if (!service) notFound();
  return <main id="main-content"><section className="page-hero service-hero"><p className="eyebrow">TSG EVENTS · SERVICES</p><p className="eyebrow service-kicker">{service.kicker}</p><h1>{service.title},<br /><em>thoughtfully planned.</em></h1><p className="hero-intro">{service.description}</p><Link className="button button-dark" href={`/contact?eventType=${encodeURIComponent(service.title === "Weddings" ? "Wedding" : service.title === "Corporate events" ? "Corporate event" : service.title === "Birthdays" ? "Birthday" : "Private celebration")}`}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link></section><section className="service-detail section-wrap"><p className="eyebrow">A THOUGHTFUL START</p><h2>Room to plan<br /><em>around what matters.</em></h2><p>{service.detail}</p><Link className="text-link" href="/contact">Start an enquiry <span aria-hidden="true">↗</span></Link></section><section className="other-services"><p className="eyebrow">MORE WAYS TO GATHER</p><div>{Object.entries(services).filter(([key]) => key !== slug).map(([key, item]) => <Link className="text-link" key={key} href={`/services/${key}`}>{item.title} <span aria-hidden="true">↗</span></Link>)}</div></section></main>;
}
