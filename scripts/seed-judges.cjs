#!/usr/bin/env node
// One-off: generate PBKDF2 hashes for predefined judge accounts.
const crypto = require("node:crypto");

const b64url = (buf) =>
  buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const ITERATIONS = 100_000;

async function hash(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(derived)}`;
}

function uuid() {
  return crypto.randomUUID();
}

function randomPassword() {
  // 12 chars, base64url, easy to dictate
  return crypto.randomBytes(9).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_").slice(0, 12);
}

(async () => {
  const judges = [];
  for (let i = 1; i <= 5; i++) {
    const email = `judge${i}@uop.local`;
    const password = randomPassword();
    const passwordHash = await hash(password);
    judges.push({ id: uuid(), email, password, hash: passwordHash });
  }

  // Print INSERT statements
  console.log("-- Run via wrangler/MCP:");
  for (const j of judges) {
    const safe = (s) => s.replace(/'/g, "''");
    console.log(
      `INSERT INTO users (id, email, full_name_en, role, password_hash) VALUES ('${j.id}', '${j.email}', 'Judge ${j.email.match(/judge(\d+)/)[1]}', 'judge', '${safe(j.hash)}');`,
    );
  }
  console.log("\n-- Credentials (share securely):");
  for (const j of judges) {
    console.log(`  ${j.email}\t${j.password}`);
  }
})();
