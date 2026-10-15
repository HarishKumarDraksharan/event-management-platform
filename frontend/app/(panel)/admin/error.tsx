"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="admin-page"><section className="admin-notice" role="alert"><h1>This section is unavailable.</h1><p>Please try again. The request did not complete.</p><button className="button button-dark" onClick={reset}>Try again</button></section></main>;
}
