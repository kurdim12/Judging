#!/usr/bin/env node
// Generate SQL for: 1 admin, 4 demo team leaders, 4 demo teams, 4 submitted submissions.
const crypto = require("node:crypto");

const b64url = (buf) =>
  buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const ITERS = 100_000;
const safe = (s) => String(s).replace(/'/g, "''");

function hash(pw) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(pw, salt, ITERS, 32, "sha256");
  return `pbkdf2$${ITERS}$${b64url(salt)}$${b64url(derived)}`;
}
function uuid() {
  return crypto.randomUUID();
}
function pw() {
  return crypto.randomBytes(9).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_").slice(0, 12);
}

const EVENT_ID = "seed-event-2026";

const out = [];
const creds = [];

// Admin
{
  const id = uuid();
  const password = pw();
  out.push(
    `INSERT OR REPLACE INTO users (id, email, full_name_en, role, password_hash) VALUES ('${id}', 'admin@uop.local', 'Admin', 'admin', '${safe(hash(password))}');`,
  );
  creds.push(`  admin@uop.local           ${password}`);
}

const teams = [
  { name: "Argo", title: "Argo — Smart Campus Energy Optimizer", desc: "An IoT + ML pipeline that cuts university building energy use by 30%.", code: "T-001" },
  { name: "Vesta", title: "Vesta — Bilingual Mental-Health Chatbot", desc: "Arabic/English voice-first wellbeing companion for students.", code: "T-002" },
  { name: "Helios", title: "Helios — Distributed Solar Forecasting", desc: "Federated learning on edge devices to predict solar output for Jordan's grid.", code: "T-003" },
  { name: "Astra", title: "Astra — Accessible Lecture Transcripts", desc: "Realtime captioning + dyslexia-friendly notes from professor microphones.", code: "T-004" },
];

teams.forEach((t, i) => {
  const leaderId = uuid();
  const password = pw();
  const teamId = uuid();
  const subId = uuid();
  const email = `team${i + 1}@uop.local`;
  out.push(
    `INSERT OR REPLACE INTO users (id, email, full_name_en, role, password_hash) VALUES ('${leaderId}', '${email}', 'Team ${i + 1} Lead', 'team_leader', '${safe(hash(password))}');`,
  );
  out.push(
    `INSERT INTO teams (id, event_id, name, display_code, leader_id) VALUES ('${teamId}', '${EVENT_ID}', '${safe(t.name)}', '${t.code}', '${leaderId}');`,
  );
  out.push(
    `INSERT INTO team_members (team_id, user_id) VALUES ('${teamId}', '${leaderId}');`,
  );
  const tech = JSON.stringify(["TypeScript", "React", "Cloudflare Workers", "Python"]);
  out.push(
    `INSERT INTO submissions (id, team_id, event_id, title, description, problem_statement, solution_summary, tech_stack, github_url, demo_url, status, submitted_at) VALUES ('${subId}', '${teamId}', '${EVENT_ID}', '${safe(t.title)}', '${safe(t.desc)}', 'A real, urgent problem the team chose to tackle.', 'Working prototype with clear user impact.', '${safe(tech)}', 'https://github.com/example/${t.name.toLowerCase()}', 'https://demo.example.com/${t.name.toLowerCase()}', 'submitted', unixepoch());`,
  );
  creds.push(`  ${email}             ${password}`);
});

// Flip event into judging phase
out.push(`UPDATE events SET phase = 'judging' WHERE id = '${EVENT_ID}';`);

console.log("-- SQL --");
console.log(out.join("\n"));
console.log("\n-- Credentials --");
creds.forEach((c) => console.log(c));
