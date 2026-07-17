import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import net from "node:net";

async function openPort() {
  const server = net.createServer();
  server.unref();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a local port");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const port = await openPort();
const origin = `http://127.0.0.1:${port}`;
const output = [];
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (chunk) => output.push(String(chunk)));
child.stderr.on("data", (chunk) => output.push(String(chunk)));

async function waitForSite() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Site exited early:\n${output.join("")}`);
    try {
      const response = await fetch(`${origin}/hackathon`, { redirect: "manual" });
      if (response.ok) return response;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Site did not become ready:\n${output.join("")}`);
}

try {
  const hackathon = await waitForSite();
  assert.equal(hackathon.status, 200);
  const hackathonPage = await hackathon.text();
  for (const required of ["Use this starter", "Copy setup command", "npm run demo", "Read the README", "Optional hosted walkthrough"]) {
    assert.match(hackathonPage, new RegExp(required), required);
  }

  const starterManifestResponse = await fetch(`${origin}/starters/v1/manifest.json`);
  assert.equal(starterManifestResponse.status, 200);
  const starterManifest = await starterManifestResponse.json();
  assert.equal(starterManifest.kits.length, 20);
  const hackathonKit = starterManifest.kits.find(({ slug }) => slug === "hackathon");
  assert.ok(hackathonKit);
  const starterArchiveResponse = await fetch(`${origin}${hackathonKit.archive}`);
  assert.equal(starterArchiveResponse.status, 200);
  const starterArchive = Buffer.from(await starterArchiveResponse.arrayBuffer());
  assert.equal(starterArchive.length, hackathonKit.size);
  assert.equal(createHash("sha256").update(starterArchive).digest("hex"), hackathonKit.sha256);

  const expressPage = await fetch(`${origin}/express`);
  assert.equal(expressPage.status, 200);

  const invalidControl = await fetch(`${origin}/api/express`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "invalid" }),
  });
  assert.equal(invalidControl.status, 400);
  assert.match(invalidControl.headers.get("cache-control") || "", /no-store/);

  const invalidResource = await fetch(`${origin}/api/express/00000000-0000-4000-8000-000000000000/source/invalid`);
  assert.equal(invalidResource.status, 404);
  assert.match(invalidResource.headers.get("cache-control") || "", /no-store/);

  const serverAction = await fetch(`${origin}/hackathon`, { headers: { "Next-Action": "not-used" } });
  assert.equal(serverAction.status, 204);

  process.stdout.write("Hackathon production smoke passed.\n");
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
