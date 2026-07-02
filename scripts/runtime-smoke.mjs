#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { chromium } = require("playwright");

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const runId = process.env.DRAWI_SMOKE_RUN_ID ?? String(Date.now());
const password = process.env.DRAWI_SMOKE_PASSWORD ?? "drawi-password";
const headless = process.env.PLAYWRIGHT_HEADLESS !== "0";
const timeoutMs = Number(process.env.DRAWI_SMOKE_TIMEOUT_MS ?? "90000");

const tutor = {
  email: `tutor-smoke-${runId}@example.com`,
  name: "Smoke Tutor",
  handle: `tutorsmoke${runId.slice(-8)}`,
};
const student = {
  email: `student-smoke-${runId}@example.com`,
  name: "Smoke Student",
  handle: `studentsmoke${runId.slice(-8)}`,
};
const lessonTitle = `Runtime smoke ${runId}`;

const allowedConsoleNoise = [
  /favicon/i,
  /Client initiated disconnect/i,
  /Abort handler called/i,
  /Abort connection attempt/i,
  /WebSocket is closed before the connection is established/i,
  /websocket closed/i,
  /hydration/i,
  /bis_skin_checked/i,
];

const browser = await chromium.launch({ headless });
const consoleFailures = [];

try {
  const tutorContext = await browser.newContext();
  const studentContext = await browser.newContext();
  const tutorPage = await tutorContext.newPage();
  const studentPage = await studentContext.newPage();

  for (const page of [tutorPage, studentPage]) {
    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      const text = message.text();
      if (allowedConsoleNoise.some((pattern) => pattern.test(text))) return;
      consoleFailures.push(`${message.type()}: ${text}`);
    });
    page.on("pageerror", (error) => {
      consoleFailures.push(`pageerror: ${error.message}`);
    });
  }

  await signUp(tutorPage, tutor);
  await saveProfile(tutorPage, tutor);
  await startLesson(tutorPage, lessonTitle);
  await expectText(tutorPage, lessonTitle);
  await expectText(tutorPage, "Synced");

  const inviteUrl = await readInviteUrl(tutorPage);
  await savePrivateNote(tutorPage, "Tutor note");

  await signUp(studentPage, student);
  await saveProfile(studentPage, student);
  await studentPage.goto(inviteUrl);
  await clickAndWaitForUrl(
    studentPage,
    studentPage.getByRole("button", { name: "Join lesson" }),
    /\/app\/sessions\//,
  );
  await expectText(studentPage, lessonTitle);
  await expectText(studentPage, "Synced");
  await savePrivateNote(studentPage, "Student note");

  await tutorPage.bringToFront();
  await tutorPage.getByRole("button", { name: "End lesson" }).click();
  await clickAndWaitForUrl(
    tutorPage,
    tutorPage.getByRole("button", { name: "End and save" }),
    /\/app\/boards\//,
  );
  await expectText(tutorPage, "Session end");
  await expectText(tutorPage, "Synced");

  await tutorPage.getByRole("button", { name: "Create checkpoint" }).click();
  await expectText(tutorPage, "Manual checkpoint");

  await clickAndWaitForUrl(
    tutorPage,
    tutorPage.getByRole("button", { name: "Restore as new" }).first(),
    /\/app\/boards\//,
  );
  await expectText(tutorPage, `${lessonTitle} restored`);
  await expectText(tutorPage, "Synced");

  if (consoleFailures.length > 0) {
    throw new Error(`Browser console failures:\n${consoleFailures.join("\n")}`);
  }

  console.log("[runtime-smoke] passed");
} finally {
  await browser.close();
}

async function signUp(page, account) {
  await page.goto(`${baseUrl}/sign-up`);
  await page.getByLabel("Name").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(password);
  await clickAndWaitForUrl(page, page.getByRole("button", { name: "Create account" }), /\/app/);
}

async function saveProfile(page, account) {
  await page.goto(`${baseUrl}/app/settings?profile=create`);
  await page.getByLabel("Display name").fill(account.name);
  await page.getByLabel("Handle").fill(account.handle);
  await page.getByLabel("Bio").fill(`Smoke profile ${runId}`);
  await page.getByRole("button", { name: "Create profile" }).click();
  await page.waitForLoadState("networkidle");
  await page.goto(`${baseUrl}/app/profile`);
  await page.waitForURL(new RegExp(`/u/${account.handle}$`), { timeout: timeoutMs });
  await expectText(page, account.name);
}

async function startLesson(page, title) {
  await page.goto(`${baseUrl}/app/boards/new`);
  await page.getByLabel("Lesson title").fill(title);
  await clickAndWaitForUrl(
    page,
    page.getByRole("button", { name: "Create board and invite" }),
    /\/app\/sessions\//,
  );
}

async function readInviteUrl(page) {
  const inviteText = await page
    .locator("text=/Invite:/")
    .first()
    .textContent({ timeout: timeoutMs });
  const match = inviteText?.match(/https?:\/\/\S+/);
  if (!match) throw new Error("Could not read invite URL from session page.");
  return match[0];
}

async function savePrivateNote(page, note) {
  const noteBox = page.getByLabel(/My private (notes|stickers)/).last();
  await noteBox.fill(note);
  await expectText(page, "Saved");
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: timeoutMs });
}

async function clickAndWaitForUrl(page, locator, url) {
  await Promise.all([page.waitForURL(url, { timeout: timeoutMs }), locator.click()]);
}
