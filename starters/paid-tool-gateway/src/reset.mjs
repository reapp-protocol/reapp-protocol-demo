import { resolve } from "node:path";

import { runSafeReset } from "../shared/reset.mjs";

const result = await runSafeReset({
  stateRoot: resolve(process.env.REAPP_STATE_ROOT ?? ".reapp"),
  archiveRoot: resolve(process.env.REAPP_ARCHIVE_ROOT ?? ".reapp-archive"),
});
console.log(result.kind === "missing" ? "No active REAPP state found." : `Archived safe REAPP state to ${result.destination}`);
