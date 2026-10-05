// API smoke test. Requires the dev server: `npm run dev`, then `npm run smoke`.
// Creates temporary records with a unique prefix and removes them afterwards.
// Override the target with SMOKE_BASE_URL (default http://127.0.0.1:5173).

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173";
const tag = `Smoke ${Date.now().toString(36)}`;
const category = `${tag} cat`;
const renamed = `${tag} renamed`;
const expenseId = `smoke-${Date.now().toString(36)}`;

let passed = 0;
const failures = [];

async function call(method, path, body, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { status: response.status, json };
}

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

async function findExpense() {
  const { json } = await call("GET", "/api/expenses");
  return json?.expenses?.find((e) => e.id === expenseId);
}

async function run() {
  console.log(`Smoke testing ${base}`);

  let r = await call("GET", "/api/categories");
  check("GET categories returns a list", r.status === 200 && Array.isArray(r.json?.categories), r);

  r = await call("GET", "/api/expenses");
  check("GET expenses returns a list", r.status === 200 && Array.isArray(r.json?.expenses), r);

  r = await call("POST", "/api/categories", { name: category });
  check("POST category creates it (201)", r.status === 201 && r.json?.category === category, r);

  r = await call("POST", "/api/categories", { name: category.toUpperCase() });
  check("POST duplicate category, any case, is rejected (409)", r.status === 409, r);

  r = await call("POST", "/api/categories", { name: "x".repeat(51) });
  check("POST overlong category name is rejected (400)", r.status === 400, r);

  r = await call("POST", "/api/expenses", { id: expenseId, category, amount: "123.45", date: "2026-01-15", note: " smoke " });
  check("POST expense creates it (201)", r.status === 201 && r.json?.expense?.cents === 12345, r);
  check("POST expense trims the note", r.json?.expense?.note === "smoke", r.json?.expense);

  const created = await findExpense();
  check("Created expense is persisted", created?.cents === 12345 && created?.category === category, created);

  for (const [label, amount] of [["negative", "-5"], ["zero", "0"], ["three decimals", "1.234"]]) {
    r = await call("POST", "/api/expenses", { id: `${expenseId}-bad`, category, amount, date: "2026-01-15", note: "" });
    check(`POST ${label} amount is rejected (400)`, r.status === 400, r);
  }

  r = await call("POST", "/api/expenses", { id: `${expenseId}-bad`, category, amount: "1", date: "2026-02-30", note: "" });
  check("POST impossible date is rejected (400)", r.status === 400, r);

  r = await call("POST", "/api/expenses", { id: `${expenseId}-bad`, category: `${tag} missing`, amount: "1", date: "2026-01-15", note: "" });
  check("POST unknown category is rejected (400)", r.status === 400, r);

  r = await call("POST", "/api/expenses", { id: `${expenseId}-x`, category, amount: "1", date: "2026-01-15", note: "" }, { Origin: "http://evil.example" });
  check("POST from a foreign origin is rejected (403)", r.status === 403, r);

  r = await call("PUT", "/api/expenses", { id: expenseId, category, amount: "50", date: "2026-01-16", note: "edited" });
  check("PUT expense updates it", r.status === 200 && r.json?.expense?.cents === 5000, r);

  r = await call("PUT", "/api/expenses", { id: `${expenseId}-missing`, category, amount: "1", date: "2026-01-15", note: "" });
  check("PUT missing expense returns 404", r.status === 404, r);

  r = await call("GET", "/api/budgets");
  check("GET budgets returns a map", r.status === 200 && typeof r.json?.budgets === "object", r);

  r = await call("PUT", "/api/budgets", { budgets: { [category]: "100.50" } });
  check("PUT budget sets it in cents", r.status === 200 && r.json?.budgets?.[category] === 10050, r);

  r = await call("PUT", "/api/budgets", { budgets: { [category]: "-1" } });
  check("PUT negative budget is rejected (400)", r.status === 400, r);

  r = await call("PUT", "/api/budgets", { budgets: { [`${tag} missing`]: "10" } });
  check("PUT budget for unknown category is rejected (400)", r.status === 400, r);

  r = await call("PUT", "/api/budgets", { budgets: { [category]: "5" } }, { Origin: "http://evil.example" });
  check("PUT budget from a foreign origin is rejected (403)", r.status === 403, r);

  r = await call("PUT", "/api/categories", { name: renamed, previous: category });
  check("PUT category renames it", r.status === 200 && r.json?.category === renamed, r);

  const moved = await findExpense();
  check("Rename cascades to existing expenses", moved?.category === renamed, moved);

  r = await call("GET", "/api/budgets");
  check("Rename cascades to the budget", r.json?.budgets?.[renamed] === 10050 && !(category in r.json.budgets), r.json);

  r = await call("PUT", "/api/budgets", { budgets: { [renamed]: "" } });
  check("PUT empty budget removes it", r.status === 200 && !(renamed in r.json.budgets), r);

  r = await call("PUT", "/api/budgets", { budgets: { [renamed]: "20" } });
  check("PUT budget again for delete-cascade check", r.status === 200 && r.json?.budgets?.[renamed] === 2000, r);

  r = await call("DELETE", "/api/categories", { name: renamed });
  check("DELETE category in use is rejected (409)", r.status === 409, r);

  r = await call("DELETE", "/api/expenses", { id: expenseId });
  check("DELETE expense succeeds", r.status === 200, r);
  check("Deleted expense is gone", !(await findExpense()));

  r = await call("DELETE", "/api/categories", { name: renamed });
  check("DELETE empty category succeeds", r.status === 200, r);

  r = await call("GET", "/api/budgets");
  check("Deleting a category removes its budget", !(renamed in (r.json?.budgets ?? {})), r.json);
}

async function cleanup() {
  // Best effort: remove anything left behind if a step failed midway.
  await call("DELETE", "/api/expenses", { id: expenseId }).catch(() => {});
  for (const name of [category, renamed]) await call("DELETE", "/api/categories", { name }).catch(() => {});
}

try {
  await run();
} catch (error) {
  failures.push(`unexpected error: ${error.message}`);
  console.error(error.cause?.code === "ECONNREFUSED" ? `Cannot reach ${base}. Is \`npm run dev\` running?` : error);
} finally {
  await cleanup();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
