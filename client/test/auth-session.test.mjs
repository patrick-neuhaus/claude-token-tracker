import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  api, ApiError, getAuthSessionVersion, onUnauthorized, resetAuthSession,
} from "../src/lib/api.ts";

const json = (body, status = 200) => Response.json(body, { status });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const unauthorized = (error) => error instanceof ApiError && error.status === 401;
const stale = (error) => unauthorized(error) && error.code === "session_changed";

afterEach(() => resetAuthSession());

test("401 protegido avisa o provider uma vez para requests concorrentes", async (t) => {
  let notifications = 0;
  t.after(onUnauthorized(() => notifications++));
  const response = deferred();
  t.mock.method(globalThis, "fetch", () => response.promise);
  const requests = [api.get("/dashboard/summary"), api.get("/dashboard/charts")];
  const results = Promise.allSettled(requests);
  response.resolve(json({ message: "No token provided" }, 401));
  for (const result of await results) {
    assert.equal(result.status, "rejected");
    assert.ok(unauthorized(result.reason));
  }
  assert.equal(notifications, 1);
});

test("login incorreto preserva mensagem e não expira sessão", async (t) => {
  let notifications = 0;
  t.after(onUnauthorized(() => notifications++));
  const version = getAuthSessionVersion();
  t.mock.method(globalThis, "fetch", async (url) => url.endsWith("csrf-token")
    ? json({ csrfToken: "csrf-login" })
    : json({ message: "Invalid email or password" }, 401));
  await assert.rejects(api.post("/auth/login", {}), (error) =>
    unauthorized(error) && error.message === "Invalid email or password");
  assert.equal(notifications, 0);
  assert.equal(getAuthSessionVersion(), version);
});

test("500 e falha de rede não notificam sessão expirada", async (t) => {
  let notifications = 0;
  t.after(onUnauthorized(() => notifications++));
  t.mock.method(globalThis, "fetch", async () => json({ message: "Unavailable" }, 500));
  await assert.rejects(api.get("/dashboard/summary"), (error) => error.status === 500);
  globalThis.fetch = async () => { throw new TypeError("Network unavailable"); };
  await assert.rejects(api.get("/dashboard/summary"), TypeError);
  assert.equal(notifications, 0);
});

test("401 antigo não derruba a sessão criada por um novo login", async (t) => {
  let notifications = 0;
  t.after(onUnauthorized(() => notifications++));
  const response = deferred();
  t.mock.method(globalThis, "fetch", () => response.promise);
  const request = api.get("/dashboard/summary");
  resetAuthSession();
  const version = getAuthSessionVersion();
  response.resolve(json({}, 401));
  await assert.rejects(request, stale);
  assert.equal(notifications, 0);
  assert.equal(getAuthSessionVersion(), version);
});

test("resposta 200 antiga não entrega dados depois do logout", async (t) => {
  const response = deferred();
  t.mock.method(globalThis, "fetch", () => response.promise);
  const request = api.get("/dashboard/summary");
  resetAuthSession();
  response.resolve(json({ previousUserData: true }));
  await assert.rejects(request, stale);
});

test("corpo JSON pendente também não restaura usuário após expiração", async (t) => {
  const body = deferred();
  const parsing = deferred();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true, status: 200,
    json: () => { parsing.resolve(); return body.promise; },
  }));
  const request = api.get("/auth/me");
  await parsing.promise;
  resetAuthSession();
  body.resolve({ id: "previous-user" });
  await assert.rejects(request, stale);
});

test("401 limpa CSRF para a próxima sessão", async (t) => {
  let csrfRequests = 0;
  const sentTokens = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("csrf-token")) return json({ csrfToken: `csrf-${++csrfRequests}` });
    if (url.endsWith("summary")) return json({}, 401);
    sentTokens.push(options.headers["X-CSRF-Token"]);
    return json({ ok: true });
  });
  await api.post("/auth/login", {});
  await assert.rejects(api.get("/dashboard/summary"), unauthorized);
  await api.post("/auth/login", {});
  assert.deepEqual(sentTokens, ["csrf-1", "csrf-2"]);
});

test("CSRF antigo não repovoa cache nem envia mutação na nova sessão", async (t) => {
  const oldCsrf = deferred();
  let csrfRequests = 0;
  const sentTokens = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("csrf-token")) {
      csrfRequests++;
      return csrfRequests === 1 ? oldCsrf.promise : json({ csrfToken: "new-csrf" });
    }
    sentTokens.push(options.headers["X-CSRF-Token"]);
    return json({ ok: true });
  });
  const previousMutation = api.post("/settings", {});
  resetAuthSession();
  await api.post("/settings", {});
  oldCsrf.resolve(json({ csrfToken: "old-csrf" }));
  await assert.rejects(previousMutation, stale);
  await api.post("/settings", {});
  assert.deepEqual(sentTokens, ["new-csrf", "new-csrf"]);
  assert.equal(csrfRequests, 2);
});

test("limpeza de React Query remove dados e cancela query pendente ao expirar", async (t) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  t.after(() => client.clear());
  t.after(onUnauthorized(() => client.clear()));
  client.setQueryData(["private-data"], { user: "previous-user" });
  const oldResponse = deferred();
  t.mock.method(globalThis, "fetch", async (url) => url.endsWith("slow")
    ? oldResponse.promise : json({}, 401));
  const pending = client.fetchQuery({ queryKey: ["slow"], queryFn: () => api.get("/slow") });
  // Registra rejection antes da limpeza síncrona cancelar a query.
  const cancelled = assert.rejects(pending);
  await assert.rejects(api.get("/dashboard/summary"), unauthorized);
  await cancelled;
  oldResponse.resolve(json({ user: "previous-user" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(client.getQueryCache().getAll().length, 0);
});

test("unsubscribe remove listener para remount do AuthProvider", async (t) => {
  let notifications = 0;
  const unsubscribe = onUnauthorized(() => notifications++);
  unsubscribe();
  t.mock.method(globalThis, "fetch", async () => json({}, 401));
  await assert.rejects(api.get("/auth/me"), unauthorized);
  assert.equal(notifications, 0);
});
