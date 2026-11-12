import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fakeKey = "test-only-not-a-real-key";
const providerURL = "https://openrouter.ai/api/v1/chat/completions";

async function configureModel(page) {
  await page.locator("#provider").selectOption("openrouter");
  await expect(page.locator("#baseUrl")).toHaveValue(
    "https://openrouter.ai/api/v1",
  );
  await page.locator("#apiKey").fill(fakeKey);
  await page.getByRole("button", { name: "Save connection" }).click();
  await expect(page.locator("#connText")).toHaveText("Model configured");
}

test("the portfolio loads local assets without runtime errors", async ({
  page,
}) => {
  const errors = [];
  const missing = [];
  const remote = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) missing.push(response.url());
  });
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      remote.push(request.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "EVERY FRAME.A FEELING.",
  );
  for (const id of ["work", "services", "about", "process", "lab", "contact"]) {
    await page.locator("#" + id).scrollIntoViewIfNeeded();
    await expect(page.locator("#" + id)).toBeVisible();
  }
  await expect
    .poll(() =>
      page
        .locator(".hero__image, .work-card__image img, .lab__source")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
  expect(remote).toEqual([]);
});

test("layouts stay inside the viewport from small phones to desktop", async ({
  page,
}) => {
  for (const file of ["/", "/chat.html"]) {
    await page.goto(file);
    for (const width of [320, 390, 650, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });
      const size = await page.evaluate(() => ({
        actual: document.documentElement.scrollWidth,
        expected: innerWidth,
      }));
      expect(size.actual, `${file} at ${width}px`).toBeLessThanOrEqual(
        size.expected,
      );
    }
  }
});

test("the mobile menu supports Escape, focus and in-page navigation", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile navigation only");
  await page.goto("/");
  const button = page.locator("#burger");
  await expect(button).toHaveAccessibleName("Open menu");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("main")).toHaveJSProperty("inert", true);
  await expect(page.locator("#nav a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
  await button.click();
  await page.locator('#nav a[href="#services"]').click();
  await expect(page).toHaveURL(/#services$/);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
});

test("the colour theme persists on both pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeColor")).toHaveAttribute(
    "content",
    "#171915",
  );
  await page.goto("/chat.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#themeColor")).toHaveAttribute(
    "content",
    "#f5f3ee",
  );
});

test("service accordions can preselect an enquiry", async ({ page }) => {
  await page.goto("/");
  const services = page.locator(".service");
  await expect(services.nth(0)).toHaveJSProperty("open", true);
  await services.nth(1).locator("summary").click();
  await expect(services.nth(1)).toHaveJSProperty("open", true);
  await expect(services.nth(0)).toHaveJSProperty("open", false);
  await services
    .nth(1)
    .getByRole("link", { name: "Let’s capture something" })
    .click();
  await expect(page.locator("#commissionService")).toHaveValue(
    "Video recording",
  );
  await expect(page).toHaveURL(/#contact$/);
});

test("the visual notebook supports arrow keys and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Open coastal visual study",
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#studyTitle")).toHaveText("The long way home.");
  await page.getByRole("button", { name: "Next visual study" }).click();
  await expect(page.locator("#studyCount")).toHaveText("02 / 03");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#studyCount")).toHaveText("01 / 03");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("the Colour Lab supports looks, keyboard sliders, pointer comparison and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mono", exact: true }).click();
  await expect(page.locator("#colourLab")).toHaveAttribute("data-look", "mono");
  await expect(
    page.getByRole("button", { name: "Mono", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const intensity = page.getByRole("slider", { name: "Colour look strength" });
  await intensity.focus();
  await page.keyboard.press("End");
  await expect(page.locator("#labIntensityValue")).toHaveText("100%");
  const comparison = page.getByRole("slider", {
    name: "Compare original and graded image",
  });
  await comparison.focus();
  await page.keyboard.press("Home");
  await expect(comparison).toHaveValue("0");
  await page.keyboard.press("ArrowRight");
  await expect(comparison).toHaveValue("1");
  await expect(comparison).toHaveAttribute(
    "aria-valuetext",
    "1 percent original, 99 percent graded",
  );
  await comparison.scrollIntoViewIfNeeded();
  const box = await comparison.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, {
    steps: 5,
  });
  await page.mouse.up();
  expect(Number(await comparison.inputValue())).toBeGreaterThanOrEqual(79);
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.locator("#colourLab")).toHaveAttribute(
    "data-look",
    "cinema",
  );
  await expect(comparison).toHaveValue("50");
  await expect(page.locator("#labIntensityValue")).toHaveText("75%");
});

test("enquiry validation produces a safe email draft, not an automatic send", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedText = text;
        },
      },
    });
  });
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Prepare my enquiry" }).click();
  await expect(page.locator("#enquiryPreview")).toBeHidden();
  expect(
    await page
      .locator("#commissionForm")
      .evaluate((form) => form.checkValidity()),
  ).toBe(false);
  await page.locator("#commissionService").selectOption("Photography");
  await page.locator("#commissionDate").fill("2050-06-20");
  await page.locator("#commissionName").fill("Test & Friend");
  await page
    .locator("#commissionDetails")
    .fill("A portrait session. <script>window.bad = true</script>");
  await page.getByRole("button", { name: "Prepare my enquiry" }).click();
  await expect(page.locator("#enquiryPreview")).toBeVisible();
  await expect(page.locator("#enquiryText")).toContainText("20 June 2050");
  await expect(page.locator("#enquiryText")).toContainText(
    "<script>window.bad = true</script>",
  );
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  const email = await page.locator("#enquiryEmail").getAttribute("href");
  expect(email).toMatch(/^mailto:xpnevin@gmail.com\?subject=/);
  expect(decodeURIComponent(email)).toContain("Test & Friend");
  await page.getByRole("button", { name: "Copy enquiry" }).click();
  expect(await page.evaluate(() => window.copiedText)).toContain("Photography");
  await page.getByRole("button", { name: "Copy email address" }).click();
  expect(await page.evaluate(() => window.copiedText)).toBe(
    "xpnevin@gmail.com",
  );
  await page.locator("#commissionName").fill("Changed name");
  await expect(page.locator("#enquiryPreview")).toBeHidden();
});

test("the assistant keeps the draft when no key is configured", async ({
  page,
}) => {
  const posts = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/chat.html");
  await page
    .getByRole("button", { name: "Let’s plan a one-minute reel." })
    .click();
  const draft = await page.locator("#input").inputValue();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Add a key first");
  await expect(page.locator("#input")).toHaveValue(draft);
  await expect(page.locator("#apiKey")).toBeFocused();
  expect(posts).toEqual([]);
});

test("the assistant configures a model, renders a mocked stream and forgets its key", async ({
  page,
}) => {
  let payload;
  await page.route(providerURL, async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer " + fakeKey);
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "access-control-allow-origin": "*" },
      body: 'data: {"choices":[{"delta":{"content":"A **clear brief** helps.\\n\\n"}}]}\n\ndata: {"choices":[{"delta":{"content":"Share your idea and deadline. <script>window.bad = true</script>"}}]}\n\ndata: [DONE]',
    });
  });
  await page.goto("/chat.html");
  await configureModel(page);
  await page.reload();
  await expect(page.locator("#apiKey")).toHaveValue(fakeKey);
  await page.locator("#input").fill("Help me shape a brief.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Reply from");
  await expect(page.locator("#turnCount")).toHaveText("2 messages");
  await expect(page.locator(".msg--ai strong")).toHaveText("clear brief");
  await expect(page.locator(".msg--ai")).toContainText(
    "<script>window.bad = true</script>",
  );
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  expect(payload.messages.at(-1).content).toBe("Help me shape a brief.");
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.locator("#turnCount")).toHaveText("0 messages");
  await expect(page.locator("#logEmpty")).toBeVisible();
  await page.getByRole("button", { name: "Forget key" }).click();
  await expect(page.locator("#apiKey")).toHaveValue("");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nevin-assistant-v1")).key,
    ),
  ).toBe("");
});

test("the assistant gives a useful provider error and leaves the message ready to retry", async ({
  page,
}) => {
  await page.route(providerURL, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"error":{"message":"Invalid test key"}}',
    }),
  );
  await page.goto("/chat.html");
  await configureModel(page);
  await page.locator("#input").fill("My test brief");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator("#status")).toContainText("That key was rejected");
  await expect(page.locator("#input")).toHaveValue("My test brief");
  await expect(page.locator("#sendBtn")).toBeEnabled();
});

test("custom provider URLs must be safe browser-accessible HTTPS endpoints", async ({
  page,
}) => {
  await page.goto("/chat.html");
  await page.locator("#provider").selectOption("custom");
  await page.locator("#modelName").fill("test-model");
  await page.locator("#apiKey").fill(fakeKey);
  for (const base of [
    "http://localhost:8080/v1",
    "https://localhost/v1",
    "https://user:password@example.com/v1",
  ]) {
    await page.locator("#baseUrl").fill(base);
    await page.getByRole("button", { name: "Save connection" }).click();
    await expect(page.locator("#settingsStatus")).toHaveAttribute(
      "data-state",
      "error",
    );
    await expect(page.locator("#connBadge")).toHaveAttribute(
      "data-state",
      "idle",
    );
  }
});

for (const file of ["/", "/chat.html"]) {
  for (const theme of ["light", "dark"]) {
    test(`${file} has no automated WCAG AA violations in ${theme} mode`, async ({
      page,
    }) => {
      await page.goto(file);
      if (theme === "dark")
        await page.getByRole("button", { name: "Switch to dark mode" }).click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    });
  }
}

test("the portfolio remains readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#nav")).toBeVisible();
  await expect(page.locator(".hero__image")).toBeVisible();
  await expect(page.locator("#themeToggle")).toBeHidden();
  await expect(page.locator(".lab__noscript")).toContainText(
    "Enable JavaScript",
  );
  await page.goto("http://127.0.0.1:4173/chat.html");
  await expect(page.locator(".chat-noscript")).toBeVisible();
  await expect(page.locator("#composer")).toBeHidden();
  await context.close();
});
