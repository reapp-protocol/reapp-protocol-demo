/**
 * REAPP boot banner. ASCII art = figlet "Big Money-nw" (dollar-sign font),
 * isolated here so it is easy to swap. Painted emerald to teal, top to bottom.
 */
import { c } from "./log";

/** Dollar-sign "REAPP" (figlet: Big Money-nw). */
const ART: string[] = [
  "$$$$$$$\\  $$$$$$$$\\  $$$$$$\\  $$$$$$$\\  $$$$$$$\\",
  "$$  __$$\\ $$  _____|$$  __$$\\ $$  __$$\\ $$  __$$\\",
  "$$ |  $$ |$$ |      $$ /  $$ |$$ |  $$ |$$ |  $$ |",
  "$$$$$$$  |$$$$$\\    $$$$$$$$ |$$$$$$$  |$$$$$$$  |",
  "$$  __$$< $$  __|   $$  __$$ |$$  ____/ $$  ____/",
  "$$ |  $$ |$$ |      $$ |  $$ |$$ |      $$ |",
  "$$ |  $$ |$$$$$$$$\\ $$ |  $$ |$$ |      $$ |",
  "\\__|  \\__|\\________|\\__|  \\__|\\__|      \\__|",
];

/** One color per row: top (mint) flowing down to deep teal. */
const GRAD = [c.mint, c.mint, c.emerald, c.emerald, c.green, c.teal, c.teal, c.deep, c.deep];

export function banner(): string {
  const art = ART.map((line, i) => "  " + (GRAD[i] ?? c.teal)(line)).join("\n");
  const tag =
    "  " +
    c.dim("agent payments ") +
    c.emerald("·") +
    c.dim(" enforced on-chain ") +
    c.emerald("·") +
    c.dim(" stellar testnet");
  return "\n" + art + "\n\n" + tag + "\n";
}
