"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  useEffect(() => { const timer = setTimeout(() => void fetch("/api/auth", { cache: "no-store" }).then((r) => r.json()).then((data) => setUser(data.user)).catch(() => {}), 0); return () => clearTimeout(timer); }, []);
  if (!user || pathname === "/login") return null;
  return <div className="account-menu"><span>{user.username}{user.role === "admin" && " · Administrator"}</span><button onClick={async () => { await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); router.push("/login"); router.refresh(); }}>Log out</button></div>;
}
