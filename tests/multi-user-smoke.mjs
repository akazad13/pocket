// Multi-user isolation smoke test.
// Validates registration, authentication, and complete data isolation between accounts.

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173";
const runId = Date.now().toString(36);

const user1 = {
  username: `alice_${runId}`,
  name: "Alice Tester",
  password: "Password123!",
};

const user2 = {
  username: `bob_${runId}`,
  name: "Bob Tester",
  password: "Password123!",
};

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

async function api(method, path, body, cookie = "") {
  const headers = { "Content-Type": "application/json" };
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {}
  return { status: response.status, headers: response.headers, json };
}

function extractCookie(res) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return "";
  const match = setCookie.match(/pocket_session=[^;]+/);
  return match ? match[0] : "";
}

async function run() {
  console.log(`Multi-user smoke test running against ${base}`);

  // 1. Register User 1
  let reg1 = await api("POST", "/api/auth/register", user1);
  check("Register User 1 succeeds (201)", reg1.status === 201, reg1);
  const cookie1 = extractCookie(reg1);
  check("Register User 1 returns session cookie", Boolean(cookie1));

  // 2. Check Auth Status User 1
  let status1 = await api("GET", "/api/auth/status", undefined, cookie1);
  check(
    "User 1 status shows authenticated as alice",
    status1.status === 200 && status1.json?.authenticated === true && status1.json?.user?.username === user1.username,
    status1
  );

  // 3. Register User 2
  let reg2 = await api("POST", "/api/auth/register", user2);
  check("Register User 2 succeeds (201)", reg2.status === 201, reg2);
  const cookie2 = extractCookie(reg2);
  check("Register User 2 returns session cookie", Boolean(cookie2));

  // 4. Duplicate Registration rejection
  let dup = await api("POST", "/api/auth/register", user1);
  check("Duplicate registration is rejected (409)", dup.status === 409, dup);

  // 5. User 1 creates an account and an expense
  const u1AccountId = `acc-u1-${runId}`;
  let acc1 = await api(
    "POST",
    "/api/accounts",
    { id: u1AccountId, name: `Alice Savings ${runId}`, type: "bank", openingBalanceCents: 50000 },
    cookie1
  );
  check("User 1 creates account (201)", acc1.status === 201, acc1);

  const u1ExpenseId = `exp-u1-${runId}`;
  let exp1 = await api(
    "POST",
    "/api/expenses",
    {
      id: u1ExpenseId,
      date: "2026-10-11",
      amount: "15.00",
      category: "Food",
      note: "Alice private lunch",
      account: u1AccountId,
    },
    cookie1
  );
  check("User 1 creates expense (201)", exp1.status === 201, exp1);

  // 6. Verify User 2 CANNOT see User 1's expense or account
  let u2Expenses = await api("GET", "/api/expenses", undefined, cookie2);
  const u2SeesExp1 = u2Expenses.json?.expenses?.some((e) => e.id === u1ExpenseId);
  check("User 2 cannot see User 1's expense (tenant isolation)", !u2SeesExp1, u2Expenses.json);

  let u2Accounts = await api("GET", "/api/accounts", undefined, cookie2);
  const u2SeesAcc1 = u2Accounts.json?.accounts?.some((a) => a.id === u1AccountId);
  check("User 2 cannot see User 1's account (tenant isolation)", !u2SeesAcc1, u2Accounts.json);

  // 7. User 2 creates their own expense
  const u2ExpenseId = `exp-u2-${runId}`;
  let exp2 = await api(
    "POST",
    "/api/expenses",
    {
      id: u2ExpenseId,
      date: "2026-10-11",
      amount: "25.00",
      category: "Food",
      note: "Bob private dinner",
    },
    cookie2
  );
  check("User 2 creates expense (201)", exp2.status === 201, exp2);

  // 8. Verify User 1 CANNOT see User 2's expense
  let u1Expenses = await api("GET", "/api/expenses", undefined, cookie1);
  const u1SeesExp2 = u1Expenses.json?.expenses?.some((e) => e.id === u2ExpenseId);
  check("User 1 cannot see User 2's expense (tenant isolation)", !u1SeesExp2, u1Expenses.json);

  // 9. Verify User 2 cannot edit or delete User 1's expense
  let hackEdit = await api(
    "PUT",
    "/api/expenses",
    {
      id: u1ExpenseId,
      date: "2026-10-11",
      amount: "99.99",
      category: "Food",
      note: "Hacked",
    },
    cookie2
  );
  check("User 2 cannot edit User 1's expense (returns 404)", hackEdit.status === 404, hackEdit);

  let hackDelete = await api("DELETE", "/api/expenses", { id: u1ExpenseId }, cookie2);
  check("User 2 cannot delete User 1's expense (returns ok:true but deletes nothing)", hackDelete.status === 200);

  // Verify Alice's expense is still there
  let u1StillHasExp = await api("GET", "/api/expenses", undefined, cookie1);
  check("Alice's expense is intact", u1StillHasExp.json?.expenses?.some((e) => e.id === u1ExpenseId));

  // 10. Clean up created records
  await api("DELETE", "/api/expenses", { id: u1ExpenseId }, cookie1);
  await api("DELETE", "/api/accounts", { id: u1AccountId }, cookie1);
  await api("DELETE", "/api/expenses", { id: u2ExpenseId }, cookie2);

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
