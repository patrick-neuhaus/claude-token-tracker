import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

// Config isolada: nenhuma conexão ou credencial do banco local é utilizada.
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET = "skill-invocations-regression-test-secret-only";
process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL = "test@example.invalid";

const { pool } = await import("../dist/config/database.js");
const { default: skillInvocationsRouter } = await import("../dist/routes/skillInvocations.js");
const { recordInvocation } = await import("../dist/services/skillInvocationsService.js");

const userId = "10000000-0000-0000-0000-000000000001";
const webhookToken = "skill-invocations-test-token";
const tokenHash = createHash("sha256").update(webhookToken).digest("hex");
const inserted = [];
let server;
let baseUrl;

before(async () => {
  pool.query = async (sql, values) => {
    if (sql.startsWith("SELECT id, email FROM users")) {
      return { rows: values[0] === tokenHash ? [{ id: userId, email: "test@example.invalid" }] : [] };
    }
    if (sql.startsWith("INSERT INTO skill_invocations")) {
      inserted.push(values);
      return { rows: [{ id: `invocation-${inserted.length}`, timestamp: values[3] }] };
    }
    if (sql.includes("AS date")) {
      return { rows: [{ date: "2026-09-09", count: "3", allow: "1", deny: "1", ask: "1" }] };
    }
    if (sql.includes("GROUP BY skill_name")) {
      return { rows: [{ skill_name: "regression-skill", count: "3" }] };
    }
    if (sql.includes("JOIN skill_allowlist")) return { rows: [{ count: "0" }] };
    throw new Error("Unexpected query in regression test");
  };

  const app = express();
  app.use(express.json());
  app.use("/api/skill-invocations", skillInvocationsRouter);
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/skill-invocations`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeAllConnections();
    });
  }
  await pool.end();
});

function track(decision, token = webhookToken) {
  return fetch(`${baseUrl}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Webhook-Token": token } : {}) },
    body: JSON.stringify({ skill_name: "regression-skill", decision, timestamp: "2026-09-09T15:00:00Z" }),
  });
}

test("hook ask recebe 201 e chega ao INSERT como ask, preservando allow e deny", async () => {
  for (const decision of ["ask", "allow", "deny"]) {
    const beforeCount = inserted.length;
    const response = await track(decision);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).status, "ok");
    assert.equal(inserted.length, beforeCount + 1);
    assert.equal(inserted.at(-1)[0], userId);
    assert.equal(inserted.at(-1)[5], decision);
  }
});

test("ask continua exigindo token webhook válido", async () => {
  const beforeCount = inserted.length;
  for (const token of ["", "invalid-token"]) {
    const response = await track("ask", token);
    assert.equal(response.status, 401);
    await response.json();
  }
  assert.equal(inserted.length, beforeCount);
});

test("decisões fora do contrato são rejeitadas sem gravar", async () => {
  const beforeCount = inserted.length;
  for (const decision of [undefined, null, "", "ASK", "approve", true, 1, ["ask"]]) {
    const response = await track(decision);
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /decision must be/);
  }
  await assert.rejects(
    recordInvocation({ user_id: userId, skill_name: "regression-skill", decision: "approve" }),
    /decision must be/,
  );
  assert.equal(inserted.length, beforeCount);
});

test("stats entrega ask separado e total inclui as três decisões", async () => {
  const bearer = jwt.sign({ userId }, process.env.JWT_SECRET);
  const response = await fetch(`${baseUrl}/stats`, { headers: { Authorization: `Bearer ${bearer}` } });
  assert.equal(response.status, 200);
  const stats = await response.json();
  assert.deepEqual(stats.dailyCount, [{ date: "2026-09-09", count: 3, allow: 1, deny: 1, ask: 1 }]);
  const day = stats.dailyCount[0];
  assert.equal(day.count, day.allow + day.deny + day.ask);
});
