import { test, expect } from "@playwright/test";
test.skip(
  !process.env.TEST_FORM,
  "Run against a server with VITE_FORM_ENDPOINT=/api/waitlist and TEST_FORM=1",
);

test("configured waitlist sends email, locale and source only after submit", async ({
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
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.locator(".form-status")).toContainText(
    "You’re on the list",
  );
  expect(sent).toEqual({
    email: "investor@example.com",
    language: "en",
    source: "watchtower-investor",
  });
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
    await page.locator("#email").fill("investor@example.com");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator(".form-status")).toContainText(
      "Could not submit",
    );
    await expect(page.locator("#email")).toHaveValue("investor@example.com");
    await expect(
      page.getByRole("button", { name: "Join the waitlist" }),
    ).toBeEnabled();
  });
}
