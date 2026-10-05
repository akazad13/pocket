// API smoke test. Requires the dev server: `npm run dev`, then `npm run smoke`.
// Creates temporary records with a unique prefix and removes them afterwards.
// Override the target with SMOKE_BASE_URL (default http://127.0.0.1:5173).

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173";
const tag = `Smoke ${Date.now().toString(36)}`;
const category = `${tag} cat`;
const renamed = `${tag} renamed`;
const expenseId = `smoke-${Date.now().toString(36)}`;
const baseCat = `${tag} base`;
const importedCat = `${tag} imported`;
const importIds = [1, 2, 3, 4, 5].map((n) => `${expenseId}-imp${n}`);
const recCat = `${tag} rec`;
const recRenamed = `${tag} rec2`;
const ruleId = `smoke-rule-${Date.now().toString(36)}`;
const incomeIds = [1, 2].map((n) => `${expenseId}-inc${n}`);
const dhakaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

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

  r = await call("PUT", "/api/categories/style", { name: category, color: "#c77868", icon: "cart" });
  check("PUT category style saves it", r.status === 200 && r.json?.color === "#c77868", r);
  r = await call("GET", "/api/categories");
  check("GET categories includes styles", r.json?.styles?.[category]?.icon === "cart", r.json?.styles);
  r = await call("PUT", "/api/categories/style", { name: category, color: "#123456", icon: "" });
  check("PUT style with an off-palette colour is rejected (400)", r.status === 400, r);
  r = await call("PUT", "/api/categories/style", { name: category, color: "", icon: "rocket" });
  check("PUT style with an unknown icon is rejected (400)", r.status === 400, r);
  r = await call("PUT", "/api/categories/style", { name: `${tag} nope`, color: "", icon: "" });
  check("PUT style for unknown category returns 404", r.status === 404, r);
  r = await call("PUT", "/api/categories/style", { name: category, color: "#c77868", icon: "cart" }, { Origin: "http://evil.example" });
  check("PUT style from a foreign origin is rejected (403)", r.status === 403, r);

  r = await call("POST", "/api/categories", { name: "x".repeat(51) });
  check("POST overlong category name is rejected (400)", r.status === 400, r);

  r = await call("POST", "/api/expenses", { id: expenseId, category, amount: "123.45", date: "2026-01-15", note: " smoke " });
  check("POST expense creates it (201)", r.status === 201 && r.json?.expense?.cents === 12345, r);
  check("POST expense trims the note", r.json?.expense?.note === "smoke", r.json?.expense);

  const created = await findExpense();
  check("Created expense is persisted", created?.cents === 12345 && created?.category === category, created);
  check("Payment method defaults to empty when omitted", created?.method === "", created);

  r = await call("POST", "/api/expenses", { id: `${expenseId}-m`, category, amount: "1", date: "2026-01-15", note: "", method: "  bKash   app " });
  check("POST expense normalises payment method", r.status === 201 && r.json?.expense?.method === "bKash app", r);
  r = await call("PUT", "/api/expenses", { id: `${expenseId}-m`, category, amount: "1", date: "2026-01-15", note: "", method: "Card" });
  const withMethod = (await call("GET", "/api/expenses")).json.expenses.find((e) => e.id === `${expenseId}-m`);
  check("PUT expense updates payment method", r.status === 200 && withMethod?.method === "Card", withMethod);
  const backupWithMethod = await (await fetch(base + "/api/backup")).json();
  check("Backup includes payment method", backupWithMethod.expenses.find((e) => e.id === `${expenseId}-m`)?.method === "Card");
  await call("DELETE", "/api/expenses", { id: `${expenseId}-m` });
  r = await call("POST", "/api/backup", { ...backupWithMethod, categories: [], budgets: {}, recurring: [], income: [], expenses: backupWithMethod.expenses.filter((e) => e.id === `${expenseId}-m`) });
  const restoredMethod = (await call("GET", "/api/expenses")).json.expenses.find((e) => e.id === `${expenseId}-m`);
  check("Restore keeps payment method", r.status === 200 && restoredMethod?.method === "Card", restoredMethod);
  await call("DELETE", "/api/expenses", { id: `${expenseId}-m` });
  r = await call("POST", "/api/expenses", { id: `${expenseId}-m`, category, amount: "1", date: "2026-01-15", note: "", method: "m".repeat(31) });
  check("POST overlong payment method is rejected (400)", r.status === 400, r);

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
  r = await call("GET", "/api/categories");
  check("Rename keeps the category style", r.json?.styles?.[renamed]?.color === "#c77868" && !(category in r.json.styles), r.json?.styles);

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

  r = await call("POST", "/api/expenses", { id: expenseId, category: renamed, amount: "50.00", date: "2026-01-16", note: "edited" });
  check("Undo: re-creating a deleted expense with the same id works", r.status === 201 && (await findExpense())?.cents === 5000, r);
  r = await call("DELETE", "/api/expenses", { id: expenseId });

  r = await call("DELETE", "/api/categories", { name: renamed });
  check("DELETE empty category succeeds", r.status === 200, r);

  r = await call("GET", "/api/budgets");
  check("Deleting a category removes its budget", !(renamed in (r.json?.budgets ?? {})), r.json);

  await backupChecks();
  await recurringChecks();
  await incomeChecks();
}

async function incomeChecks() {
  const [id, restoredId] = incomeIds;
  const entry = { id, source: "  Salary   Oct ", amount: "85000.50", date: "2026-10-01", note: " pay " };
  for (const [label, patch] of [["empty source", { source: "  " }], ["long source", { source: "x".repeat(51) }], ["zero amount", { amount: "0" }], ["bad date", { date: "2026-02-30" }], ["long note", { note: "n".repeat(201) }]]) {
    const r = await call("POST", "/api/income", { ...entry, ...patch });
    check(`POST income with ${label} is rejected (400)`, r.status === 400, r);
  }
  let r = await call("POST", "/api/income", entry, { Origin: "http://evil.example" });
  check("POST income from a foreign origin is rejected (403)", r.status === 403, r);

  r = await call("POST", "/api/income", entry);
  check("POST income creates it, normalising source and note", r.status === 201 && r.json?.income?.cents === 8500050 && r.json.income.source === "Salary Oct" && r.json.income.note === "pay", r);
  r = await call("POST", "/api/income", entry);
  check("POST duplicate income id is rejected (409)", r.status === 409, r);

  r = await call("GET", "/api/income");
  check("GET income lists it", r.status === 200 && r.json?.income?.some((x) => x.id === id), r.status);

  r = await call("PUT", "/api/income", { ...entry, amount: "90000", source: "Bonus" });
  check("PUT income updates it", r.status === 200 && r.json?.income?.cents === 9000000 && r.json.income.source === "Bonus", r);
  r = await call("PUT", "/api/income", { ...entry, id: `${id}-missing` });
  check("PUT missing income returns 404", r.status === 404, r);

  const backup = await (await fetch(base + "/api/backup")).json();
  check("Backup includes income", backup.income?.some((x) => x.id === id));
  r = await call("POST", "/api/backup", { app: "pocket", version: 1, exportedAt: "", categories: [], budgets: {}, expenses: [], income: [{ id: restoredId, source: "Gift", cents: 500, date: "2026-10-02", note: "" }, backup.income.find((x) => x.id === id)] });
  check("Restore adds missing income and skips existing", r.status === 200 && r.json?.incomeAdded === 1, r);

  r = await call("DELETE", "/api/income", { id });
  check("DELETE income succeeds", r.status === 200, r);
  r = await call("GET", "/api/income");
  check("Deleted income is gone", !r.json.income.some((x) => x.id === id));
}

async function generated() {
  const { json } = await call("GET", "/api/expenses");
  return json.expenses.filter((e) => e.id.startsWith(`rec-${ruleId}-`));
}

async function recurringChecks() {
  await call("POST", "/api/categories", { name: recCat });
  const rule = { id: ruleId, category: recCat, amount: "1000", day: 31, note: "rent", startMonth: "2026-01" };

  for (const [label, patch] of [["day 0", { day: 0 }], ["day 32", { day: 32 }], ["month 13", { startMonth: "2026-13" }], ["unknown category", { category: `${tag} nope` }], ["negative amount", { amount: "-1" }]]) {
    const r = await call("POST", "/api/recurring", { ...rule, ...patch });
    check(`POST recurring with ${label} is rejected (400)`, r.status === 400, r);
  }
  let r = await call("POST", "/api/recurring", rule, { Origin: "http://evil.example" });
  check("POST recurring from a foreign origin is rejected (403)", r.status === 403, r);

  r = await call("POST", "/api/recurring", rule);
  check("POST recurring creates it (201)", r.status === 201 && r.json?.rule?.cents === 100000 && r.json.rule.lastMonth === null, r);

  // Expected: one per month from 2026-01, on the 31st clamped to month length, up to today.
  const expected = [];
  for (let m = 1; m <= 12; m++) {
    const month = `2026-${String(m).padStart(2, "0")}`;
    const last = new Date(Date.UTC(2026, m, 0)).getUTCDate();
    const date = `${month}-${String(Math.min(31, last)).padStart(2, "0")}`;
    if (date <= dhakaToday) expected.push(date);
  }
  let rows = await generated();
  check(`Reading expenses generates every due month (${expected.length})`, rows.length === expected.length && expected.every((d) => rows.some((e) => e.date === d)), rows.map((e) => e.date));
  check("Day 31 clamps to Feb 28 and Apr 30", rows.some((e) => e.date === "2026-02-28") && rows.some((e) => e.date === "2026-04-30"));
  check("Generated expenses carry amount, category and note", rows.every((e) => e.cents === 100000 && e.category === recCat && e.note === "rent"), rows[0]);

  rows = await generated();
  check("Generation is idempotent", rows.length === expected.length, rows.length);

  await call("DELETE", "/api/expenses", { id: `rec-${ruleId}-2026-02` });
  rows = await generated();
  check("A deleted generated expense is not re-created", !rows.some((e) => e.date === "2026-02-28") && rows.length === expected.length - 1, rows.length);

  const beforeEdit = new Set(rows.map((e) => e.id));
  r = await call("PUT", "/api/recurring", { ...rule, amount: "1200", day: 5 });
  check("PUT recurring updates it", r.status === 200 && r.json?.rule?.cents === 120000 && r.json.rule.day === 5, r);
  rows = await generated();
  check("Editing a rule does not change past expenses", rows.filter((e) => beforeEdit.has(e.id)).every((e) => e.cents === 100000), rows.map((e) => e.cents));
  check("Months generated after an edit use the new amount", rows.filter((e) => !beforeEdit.has(e.id)).every((e) => e.cents === 120000 && e.date.endsWith("-05")), rows.filter((e) => !beforeEdit.has(e.id)));
  const afterEdit = rows.length;

  r = await call("DELETE", "/api/categories", { name: recCat });
  check("DELETE category used by a rule is rejected (409)", r.status === 409, r);

  r = await call("PUT", "/api/categories", { name: recRenamed, previous: recCat });
  r = await call("GET", "/api/recurring");
  check("Category rename cascades to rules", r.json?.rules?.find((x) => x.id === ruleId)?.category === recRenamed, r.json);

  const backup = await (await fetch(base + "/api/backup")).json();
  check("Backup includes recurring rules", backup.recurring?.some((x) => x.id === ruleId));

  r = await call("DELETE", "/api/recurring", { id: ruleId });
  check("DELETE recurring succeeds", r.status === 200, r);
  rows = await generated();
  check("Deleting a rule keeps generated expenses", rows.length === afterEdit, rows.length);
}

async function backupChecks() {
  const [dup, caseMapped, inNewCat, invalid, partial] = importIds;
  await call("POST", "/api/categories", { name: baseCat });
  await call("POST", "/api/expenses", { id: dup, category: baseCat, amount: "10", date: "2026-03-01", note: "" });

  let r = await fetch(base + "/api/backup");
  const backup = await r.json();
  check("GET backup downloads a Pocket backup", r.status === 200 && backup.app === "pocket" && r.headers.get("content-disposition")?.includes("attachment"), backup.app);
  check("Backup includes expenses and categories", backup.expenses?.some((e) => e.id === dup) && backup.categories?.includes(baseCat));

  await call("PUT", "/api/categories/style", { name: baseCat, color: "#4f8fa8", icon: "" });
  const file = {
    app: "pocket", version: 1, exportedAt: new Date().toISOString(),
    categories: [baseCat.toUpperCase(), importedCat],
    budgets: { [importedCat]: 50000 },
    styles: { [importedCat]: { color: "#6b7fc7", icon: "plane" }, [baseCat]: { color: "#c9a227", icon: "gift" } },
    expenses: [
      { id: dup, category: baseCat, cents: 1000, date: "2026-03-01", note: "" },
      { id: caseMapped, category: baseCat.toLowerCase(), cents: 2550, date: "2026-03-02", note: "mapped" },
      { id: inNewCat, category: importedCat, cents: 99, date: "2026-03-03", note: "" },
    ],
  };
  r = await call("POST", "/api/backup", file);
  check("Restore merges new data and skips existing", r.status === 200 && r.json?.categoriesAdded === 1 && r.json?.expensesAdded === 2 && r.json?.expensesSkipped === 1 && r.json?.budgetsAdded === 1, r);

  const { json } = await call("GET", "/api/expenses");
  check("Restore maps category names case-insensitively", json.expenses.find((e) => e.id === caseMapped)?.category === baseCat);
  r = await call("GET", "/api/budgets");
  check("Restore adds budgets", r.json?.budgets?.[importedCat] === 50000, r.json);
  r = await call("GET", "/api/categories");
  check("Restore styles new categories but keeps existing styles", r.json?.styles?.[importedCat]?.icon === "plane" && r.json?.styles?.[baseCat]?.color === "#4f8fa8", r.json?.styles);
  check("Backup includes styles", backup.styles !== undefined);

  r = await call("POST", "/api/backup", { app: "other" });
  check("Restore rejects a non-Pocket file (400)", r.status === 400, r);

  r = await call("POST", "/api/backup", { ...file, expenses: [{ id: partial, category: importedCat, cents: 100, date: "2026-03-04", note: "" }, { id: invalid, category: importedCat, cents: -5, date: "2026-03-04", note: "" }] });
  const after = (await call("GET", "/api/expenses")).json.expenses;
  check("Restore with one bad expense writes nothing (400)", r.status === 400 && !after.some((e) => e.id === partial), r);

  r = await call("POST", "/api/backup", file, { Origin: "http://evil.example" });
  check("Restore from a foreign origin is rejected (403)", r.status === 403, r);
}

async function cleanup() {
  // Best effort: remove anything left behind if a step failed midway.
  await call("DELETE", "/api/recurring", { id: ruleId }).catch(() => {});
  for (const id of incomeIds) await call("DELETE", "/api/income", { id }).catch(() => {});
  const leftovers = await generated().catch(() => []);
  for (const id of [expenseId, `${expenseId}-m`, ...importIds, ...leftovers.map((e) => e.id)]) await call("DELETE", "/api/expenses", { id }).catch(() => {});
  for (const name of [category, renamed, baseCat, importedCat, recCat, recRenamed]) await call("DELETE", "/api/categories", { name }).catch(() => {});
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
