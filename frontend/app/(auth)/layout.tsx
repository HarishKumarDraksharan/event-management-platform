import "../admin.css";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><a className="skip-link" href="#main-content">Skip to content</a>{children}</>;
}
