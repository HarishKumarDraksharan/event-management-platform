"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSignOutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        router.replace("/admin/sign-in");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return <button className="admin-signout" onClick={signOut} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}
