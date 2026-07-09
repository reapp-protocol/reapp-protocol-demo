"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const links = [
  { href: "/", label: "Docs" },
  { href: "/cli", label: "CLI" },
  { href: "/research", label: "Research demo" },
  { href: "/video", label: "Video demo" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#050807]/72 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-emerald-300/20 bg-emerald-400/90 text-sm font-black text-[#06241a] shadow-[0_0_20px_rgba(52,211,153,0.22)] transition group-hover:bg-emerald-300">R</span>
          <span className="text-sm font-semibold tracking-tight text-emerald-50/90">REAPP</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-white/8 bg-white/[0.035] p-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "text-emerald-100" : "text-emerald-100/48 hover:text-emerald-100/82"
                }`}
              >
                {l.label}
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-full bg-emerald-400/12 ring-1 ring-emerald-300/18" />
                )}
              </Link>
            );
          })}
          <a
            href="https://www.npmjs.com/package/reapp-protocol-cli"
            target="_blank"
            rel="noreferrer"
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-400/10 px-3 py-1.5 text-[13px] font-semibold text-emerald-200 transition hover:border-emerald-300/35 hover:bg-emerald-400/16 hover:text-emerald-100"
          >
            npm
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
