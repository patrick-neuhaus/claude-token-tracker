import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { csrfGuard, csrfProtection } from "../dist/middleware/csrf.js";

const ingestionPaths = [
  "/api/tool-invocations/track",
  "/api/skill-invocations/track",
  "/api/compactions/track",
];

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(cookieParser());
  app.use(csrfGuard);
  app.get("/api/auth/csrf-token", csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  // Stub verifica somente passagem pelo guard; autenticação real fica no smoke.
  app.use((_req, res) => res.json({ reached: true }));
  app.use((err, _req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") {
      return res.status(403).json({ error: "csrf_invalid" });
    }
    next(err);
  });
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
    server.closeAllConnections();
  });
});

async function expectResponse(path, method, status, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers });
  assert.equal(response.status, status, `${method} ${path}`);
  if (method !== "HEAD") {
    assert.deepEqual(
      await response.json(),
      status === 403 ? { error: "csrf_invalid" } : { reached: true },
      `${method} ${path}`,
    );
  }
}

test("POST dos três coletores passa sem cookie ou token CSRF", async () => {
  for (const path of ingestionPaths) {
    await expectResponse(path, "POST", 200);
  }
});

test("isenções acompanham case, uma barra final e query aceitos pelo Express", async () => {
  for (const path of ingestionPaths) {
    for (const variant of [path.toUpperCase(), `${path}/`, `${path}?source=claude`, `${path.toUpperCase()}/?source=codex`]) {
      await expectResponse(variant, "POST", 200);
    }
  }
});

test("paths vizinhos e protegidos continuam exigindo CSRF com header webhook", async () => {
  const headers = { "X-Webhook-Token": "regression-test-only" };
  for (const path of ingestionPaths) {
    for (const sibling of [path.replace(/\/track$/, ""), `${path}-other`, `${path}/extra`, `${path}//`]) {
      await expectResponse(sibling, "POST", 403, headers);
    }
  }
  await expectResponse("/api/settings/profile", "POST", 403, headers);
  await expectResponse("/api/auth/login/extra", "POST", 403, headers);
});

test("isenções de coletores não liberam PUT, PATCH ou DELETE", async () => {
  for (const path of ingestionPaths) {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      await expectResponse(path, method, 403, { "X-Webhook-Token": "regression-test-only" });
    }
  }
});

test("mutação protegida exige o cookie e o token CSRF correspondente", async () => {
  const response = await fetch(`${baseUrl}/api/auth/csrf-token`);
  assert.equal(response.status, 200);
  const { csrfToken } = await response.json();
  assert.equal(typeof csrfToken, "string");
  const setCookie = response.headers.get("set-cookie");
  assert.match(setCookie, /^_csrf=/);
  const cookie = setCookie.split(";")[0];
  const path = "/api/settings/profile";

  await expectResponse(path, "POST", 403);
  await expectResponse(path, "POST", 403, { Cookie: cookie });
  await expectResponse(path, "POST", 403, { "X-CSRF-Token": csrfToken });
  await expectResponse(path, "POST", 403, { Cookie: cookie, "X-CSRF-Token": "wrong-token" });
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    await expectResponse(path, method, 200, { Cookie: cookie, "X-CSRF-Token": csrfToken });
  }
});

test("métodos seguros e isenções existentes continuam funcionando", async () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    await expectResponse("/api/settings/profile", method, 200);
  }
  for (const path of [
    "/api/webhook/track-tokens",
    "/health",
    "/health/live",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot",
    "/api/auth/reset",
    "/api/auth/csrf-token",
  ]) {
    await expectResponse(path, "POST", 200);
  }
});
