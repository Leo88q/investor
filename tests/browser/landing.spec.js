import { test, expect } from "@playwright/test";

test("RU default, shareable EN, back navigation and metadata", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page).toHaveTitle(/прозрачная/);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.locator("h1")).toContainText("A transparent Web3");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(/transparent/);
  await page.reload();
  await expect(page.locator("h1")).toContainText("A transparent Web3");
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  expect(errors).toEqual([]);
});

test("four dashboard tabs work with mouse and keyboard", async ({ page }) => {
  await page.goto("/?lang=en#watchtower");
  const dashboard = page.locator("#watchtower .dashboard");
  await dashboard.getByRole("tab", { name: "Funnels" }).click();
  await expect(dashboard.getByRole("tabpanel")).toContainText(
    "conversions unavailable",
  );
  await page.keyboard.press("ArrowRight");
  await expect(
    dashboard.getByRole("tab", { name: "Investors" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dashboard.getByRole("tabpanel")).toContainText(
    "Snapshots & payouts",
  );
  await dashboard.getByRole("tab", { name: "Acquisition" }).click();
  await expect(dashboard.getByRole("tabpanel")).toContainText(
    "Bots and people counted separately",
  );
  await dashboard.getByRole("button", { name: "Expand demo" }).click();
  await expect(dashboard).toHaveClass(/expanded/);
  await dashboard.getByRole("button", { name: "Collapse demo" }).click();
  await expect(dashboard).not.toHaveClass(/expanded/);
  await dashboard.getByRole("tab", { name: "Overview" }).click();
  await expect(dashboard.getByRole("tabpanel")).toContainText("No live data");
  await expect(dashboard.getByText("DEMO DATA", { exact: true })).toBeVisible();
});

test("calculator updates correct scenarios and clamps losses to zero", async ({
  page,
}) => {
  await page.goto("/?lang=en#math");
  const input = page.locator("#profit-input");
  await expect(page.locator(".calc-result strong")).toHaveText("$500");
  await input.fill("400000");
  await expect(page.locator(".calc-result strong")).toHaveText("$1,000");
  await expect(page.locator(".calc-result b")).toHaveText("$250");
  await input.fill("0");
  await expect(page.locator(".calc-result strong")).toHaveText("$0");
  await input.fill("-500");
  await expect(input).toHaveValue("0");
  await input.fill("200000");
  const range = page.getByRole("slider");
  await range.focus();
  await page.keyboard.press("ArrowRight");
  await expect(input).toHaveValue("201000");
  await expect(page.locator(".calc-result strong")).toHaveText("$502.5");
});

test("Terms dialog is accessible, trapped and dismissible; FAQ expands", async ({
  page,
}) => {
  await page.goto("/?lang=en#offer");
  const trigger = page
    .locator("#offer")
    .getByRole("button", { name: "Terms of the Share" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("not the complete agreement");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page
    .getByText("What if the studio makes no profit?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toContainText("dividend is zero");
  await page
    .getByText("What if the studio makes no profit?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toHaveCount(0);
});

test("presale navigates to waitlist and does not pretend to collect email", async ({
  page,
}) => {
  await page.goto("/?lang=en");
  await page.getByRole("link", { name: /Get your share/ }).click();
  await expect(page).toHaveURL(/#offer$/);
  await page
    .locator("#offer")
    .getByRole("link", { name: "Claim yours, one of 100" })
    .click();
  await expect(page).toHaveURL(/#waitlist$/);
  await expect(page.locator("#email")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Join the waitlist" }),
  ).toBeDisabled();
  await expect(page.locator(".form-note")).toContainText(
    "not being collected or stored",
  );
  await page
    .getByRole("button", { name: "Ask the founder a question" })
    .click();
  await expect(page.locator(".contact-note")).toContainText(
    "will be published",
  );
});

test("every image resolves and anchor has a target", async ({ page }) => {
  await page.goto("/");
  for (const img of await page.locator("img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
      .toBeTruthy();
  }
  expect(
    await page
      .locator('a[href^="#"]')
      .evaluateAll((as) =>
        as
          .filter((a) => a.hash && !document.getElementById(a.hash.slice(1)))
          .map((a) => a.hash),
      ),
  ).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  for (const lang of ["ru", "en"]) {
    test(`no overflow at ${width}px in ${lang}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/?lang=${lang}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(overflow).toBe(false);
      await expect(page.locator("h1")).toBeVisible();
      if (width < 760) {
        await page
          .getByRole("button", {
            name: lang === "ru" ? "Открыть меню" : "Open menu",
          })
          .click();
        await expect(page.locator(".main-nav")).toBeVisible();
        await page.locator(".main-nav a").first().click();
        await expect(page.locator(".main-nav")).not.toBeVisible();
        await expect(page).toHaveURL(/#ecosystem$/);
      }
    });
  }
}
