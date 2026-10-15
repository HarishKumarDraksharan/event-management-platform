import type { Metadata } from "next";
import { EnquiryForm } from "../../../components/enquiry-form";

export const metadata: Metadata = { title: "Contact", description: "Send TSG EVENTS an enquiry about a wedding, corporate event, birthday or private celebration." };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ eventType?: string }> }) {
  const { eventType } = await searchParams;
  const eventTypes: Record<string, string> = { wedding: "Wedding", "corporate-event": "Corporate event", birthday: "Birthday", "private-celebration": "Private celebration" };
  return <main id="main-content"><section className="page-hero contact-hero"><p className="eyebrow">LET’S BEGIN WITH A CONVERSATION</p><h1>Tell us what<br />you’re <em>imagining.</em></h1><p className="hero-intro">A date, an idea, a feeling you want the day to have. Share what you know so far and we’ll take it from there.</p></section><section className="contact-layout section-wrap"><div className="contact-aside"><p className="eyebrow">YOUR ENQUIRY</p><h2>A little about<br />your plans.</h2><p>There’s no need to have everything figured out. A few starting details are plenty.</p><p className="privacy-note">The information in this form is used only to respond to your enquiry.</p></div><EnquiryForm initialEventType={eventType ? eventTypes[eventType.toLowerCase()] ?? eventType : ""} /></section></main>;
}
