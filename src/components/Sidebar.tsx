"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/leads", label: "Lead Finder", icon: "🎯" },
  { href: "/outreach", label: "Cold Outreach", icon: "📧" },
  { href: "/content", label: "Content Creator", icon: "✍️" },
  { href: "/followup", label: "Follow-ups", icon: "🔄" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Agency AI</h1>
        <p className="text-xs text-slate-400 mt-0.5">Client Acquisition System</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              path === item.href
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">Powered by Claude AI</p>
      </div>
    </aside>
  );
}
