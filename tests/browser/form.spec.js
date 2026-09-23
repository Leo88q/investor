import { test, expect } from "@playwright/test";
test.skip(
  !process.env.TEST_FORM,
  "Run against a server with VITE_FORM_ENDPOINT=/api/waitlist and TEST_FORM=1",
);

/**
 * The form treats a submit that arrives less than
 * `config.lead.minimumSubmitSeconds` (2 s) after mount as a bot signal and
 * drops it silently, so a genuine run has to let the form arm first.
 */
async function fillAndSubmit(page, email = "investor@example.com") {
  await page.locator("#email").fill(email);
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
}

test("configured waitlist sends the frozen lead contract plus consents", async ({
  page,
}) => {
  let sent = null;
  await page.route("**/api/waitlist", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto("/?lang=en#waitlist");
  await page.locator("#email").fill("investor@example.com");
  expect(sent).toBeNull();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.locator(".form-status")).toContainText(
    "You’re on the list",
  );
  // The four frozen keys stay exactly as before; `consents` is the additive
  // part of the interlock i-02 contract and is audited by the consent journal.
  expect(sent).toMatchObject({
    email: "investor@example.com",
    language: "en",
    source: "watchtower-investor",
  });
  expect(Object.keys(sent)).toEqual(["email", "language", "source", "consents"]);
  expect(sent.consents).toMatchObject({ email: true, source: "watchtower-investor" });
  expect(sent.consents.termsVersion).toBe("investor-lead-v1");
  // The consent journal is written before the request leaves the browser.
  const journal = await page.evaluate(() =>
    window.localStorage.getItem("watchtower.investor.consents.v1"),
  );
  expect(JSON.parse(journal)).toMatchObject({ email: true, language: "en" });
  await expect(page.locator("#email")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Join the waitlist" }),
  ).toBeDisabled();
});

for (const response of [
  {
    status: 500,
    contentType: "application/json",
    body: '{"error":"server error"}',
  },
  {
    status: 200,
    contentType: "text/html",
    body: "<html>Static fallback, not a form handler</html>",
  },
  { status: 200, contentType: "application/json", body: '{"ok":false}' },
]) {
  test(`does not fake success for ${response.status} ${response.body.slice(0, 20)}`, async ({
    page,
  }) => {
    await page.route("**/api/waitlist", (route) => route.fulfill(response));
    await page.goto("/?lang=en#waitlist");
    await fillAndSubmit(page);
    await expect(page.locator(".form-status")).toContainText(
      "Could not submit",
    );
    await expect(page.locator("#email")).toHaveValue("investor@example.com");
    await expect(
      page.getByRole("button", { name: "Join the waitlist" }),
    ).toBeEnabled();
  });
}
