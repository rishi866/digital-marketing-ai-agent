"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",           label: "Dashboard",    icon: "📊" },
  { href: "/leads",      label: "Lead Finder",  icon: "🎯" },
  { href: "/pipeline",   label: "Pipeline",     icon: "📋" },
  { href: "/tools",      label: "AI Tools",     icon: "🤖" },
  { href: "/outreach",   label: "Cold Outreach",icon: "📧" },
  { href: "/campaigns",  label: "Campaigns",    icon: "📣" },
  { href: "/proposals",  label: "Proposals",    icon: "📄" },
  { href: "/content",    label: "Content",      icon: "✍️" },
  { href: "/followup",   label: "Follow-ups",   icon: "🔄" },
  { href: "/reports",    label: "Reports",      icon: "📈" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-52 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-base font-bold text-white">Agency AI</h1>
        <p className="text-xs text-slate-400 mt-0.5">Client Acquisition System</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              path === item.href ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">Powered by Claude AI</p>
      </div>
    </aside>
  );
}
