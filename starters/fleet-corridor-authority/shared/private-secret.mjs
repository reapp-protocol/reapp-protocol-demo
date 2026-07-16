import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { validateChallengeSecret } from "./config.mjs";

const MAX_SECRET_FILE_BYTES = 4_096;

async function readExistingSecret(filePath) {
  const info = await stat(filePath);
  if (!info.isFile() || info.size < 32 || info.size > MAX_SECRET_FILE_BYTES) {
    throw new Error("challenge secret file is not a safe private file");
  }
  const value = (await readFile(filePath, "utf8")).trimEnd();
  validateChallengeSecret(value);
  await chmod(filePath, 0o600);
  return value;
}

export async function loadOrCreateChallengeSecret(filePath) {
  const path = resolve(filePath);
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  try {
    return await readExistingSecret(path);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const secret = randomBytes(48).toString("base64url");
  validateChallengeSecret(secret);
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(`${secret}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    const directoryHandle = await open(directory, "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
    return secret;
  } catch (error) {
    if (error?.code === "EEXIST") return readExistingSecret(path);
    throw error;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}
