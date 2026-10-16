"use client";

import Link from "next/link";
import { FocusEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import type { PublicService } from "../lib/public-content";

type SiteHeaderProps = { services?: PublicService[] | null };

export function SiteHeader({ services = [] }: SiteHeaderProps) {
  const [compact, setCompact] = useState(false);
  const mobileNavigation = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const update = () => setCompact(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`site-header${compact ? " is-compact" : ""}`}>
      <Link className="brand" href="/" aria-label="TSG EVENTS home">
        <span className="brand-mark" aria-hidden="true">T</span><span>TSG EVENTS</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About Us</Link>
        <ServiceDropdown services={services} className="desktop-service-dropdown" />
        <Link href="/portfolio">Gallery</Link>
        <Link href="/contact">Contact</Link>
        <Link className="nav-cta" href="/contact">Let&apos;s Talk</Link>
      </nav>
      <details ref={mobileNavigation} className="mobile-nav">
        <summary aria-label="Open navigation menu"><span>Menu</span><span className="menu-icon" aria-hidden="true">☰</span></summary>
        <nav aria-label="Mobile navigation" onClick={(event) => { if (event.target instanceof HTMLAnchorElement && mobileNavigation.current) mobileNavigation.current.open = false; }}>
          <Link href="/">Home</Link>
          <Link href="/about">About Us</Link>
          <ServiceDropdown services={services} className="mobile-service-dropdown" />
          <Link href="/portfolio">Gallery</Link>
          <Link href="/contact">Contact</Link>
          <Link className="mobile-nav-cta" href="/contact">Let&apos;s Talk</Link>
        </nav>
      </details>
    </header>
  );
}

function ServiceDropdown({ services, className }: { services?: PublicService[] | null; className: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);

  function setDropdownOpen(open: boolean) {
    if (details.current) details.current.open = open;
    setIsOpen(open);
  }

  function openFromPointer(event: ReactPointerEvent<HTMLDetailsElement>) {
    if (className === "desktop-service-dropdown" && event.pointerType !== "touch") setDropdownOpen(true);
  }

  function closeToPointer(event: ReactPointerEvent<HTMLDetailsElement>) {
    if (className === "desktop-service-dropdown" && event.pointerType !== "touch") setDropdownOpen(false);
  }

  function closeOnBlur(event: FocusEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropdownOpen(false);
  }

  function syncOpenState(event: SyntheticEvent<HTMLDetailsElement>) {
    setIsOpen(event.currentTarget.open);
  }

  function syncClickState() {
    if (details.current) setIsOpen(!details.current.open);
  }

  function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === "Escape" && details.current) {
      event.preventDefault();
      setDropdownOpen(false);
      summary.current?.focus();
      return;
    }

    const items = details.current?.querySelectorAll<HTMLAnchorElement>(".service-dropdown-list a");
    if (!items?.length) return;

    if (event.target === summary.current && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setDropdownOpen(true);
      const target = event.key === "ArrowDown" ? items[0] : items[items.length - 1];
      target.focus();
      return;
    }

    if (event.target instanceof HTMLAnchorElement && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const currentIndex = Array.from(items).indexOf(event.target);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + direction + items.length) % items.length].focus();
    }
  }

  return <details ref={details} className={className} onPointerEnter={openFromPointer} onPointerLeave={closeToPointer} onBlur={closeOnBlur} onKeyDown={closeOnEscape} onToggle={syncOpenState}>
    <summary ref={summary} aria-label="Services" aria-haspopup="true" aria-expanded={isOpen} aria-controls={panelId} onClick={syncClickState}>Services <span aria-hidden="true">⌄</span></summary>
    <div className="service-dropdown-list" id={panelId}>
      <div className="service-dropdown-panel">
        <Link href="/#services">All services</Link>
        {services === null ? <span role="status">Services are temporarily unavailable.</span> : services?.map((service) => <Link key={service.id} href={`/services/${service.slug}`}>{service.title}</Link>)}
      </div>
    </div>
  </details>;
}
