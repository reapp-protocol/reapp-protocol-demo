"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const links = [
  { href: "/", label: "Demo" },
  { href: "/docs", label: "Docs" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0e0d]/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-black text-[#06241a]">R</span>
          <span className="font-bold tracking-tight">REAPP</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? "text-emerald-300" : "text-emerald-100/60 hover:text-emerald-100"}`}
              >
                {l.label}
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/30" />
                )}
              </Link>
            );
          })}
          <a
            href="https://www.npmjs.com/package/@reapp-sdk/core"
            target="_blank"
            rel="noreferrer"
            className="ml-2 rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-[#06241a] transition hover:bg-emerald-300"
          >
            npm ↗
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
