import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { getPublicServices } from "../../lib/public-content";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const services = await getPublicServices();
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader services={services} />{children}<SiteFooter /></>;
}
