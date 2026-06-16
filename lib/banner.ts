/**
 * REAPP boot banner: figlet "ANSI Shadow", each letter painted its own neon
 * brand shade (cyan, mint, emerald, teal, green). Generated; edit the plan in
 * the build step or tweak colors via lib/log.ts.
 */
import { c } from "./log";

type Seg = [string, keyof typeof c];
const ART: Seg[][] = [[["██████╗ ","cyan"],["███████╗","mint"],[" █████╗ ","emerald"],["██████╗ ","teal"],["██████╗ ","green"]],[["██╔══██╗","cyan"],["██╔════╝","mint"],["██╔══██╗","emerald"],["██╔══██╗","teal"],["██╔══██╗","green"]],[["██████╔╝","cyan"],["█████╗  ","mint"],["███████║","emerald"],["██████╔╝","teal"],["██████╔╝","green"]],[["██╔══██╗","cyan"],["██╔══╝  ","mint"],["██╔══██║","emerald"],["██╔═══╝ ","teal"],["██╔═══╝ ","green"]],[["██║  ██║","cyan"],["███████╗","mint"],["██║  ██║","emerald"],["██║     ","teal"],["██║     ","green"]],[["╚═╝  ╚═╝","cyan"],["╚══════╝","mint"],["╚═╝  ╚═╝","emerald"],["╚═╝     ","teal"],["╚═╝     ","green"]]];

export function banner(): string {
  const paint = (col: keyof typeof c, t: string) => (c[col] as (s: string) => string)(t);
  const art = ART.map((row) => "  " + row.map(([t, col]) => paint(col, t)).join("")).join("\n");
  const tag =
    "  " +
    c.dim("agent payments") + c.emerald(" · ") +
    c.dim("enforced on-chain") + c.emerald(" · ") +
    c.dim("stellar testnet");
  return art + "\n" + tag;
}
