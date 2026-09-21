import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateShare, getLanguage, money } from "../src/math.js";
import { content } from "../src/content.js";
test("brief scenarios and no double deduction", () => {
  assert.deepEqual(calculateShare(100000), {
    pool: 25000,
    annual: 250,
    quarterly: 62.5,
  });
  assert.deepEqual(calculateShare(200000), {
    pool: 50000,
    annual: 500,
    quarterly: 125,
  });
  assert.deepEqual(calculateShare(400000), {
    pool: 100000,
    annual: 1000,
    quarterly: 250,
  });
});
test("zero and losses never pay a dividend", () => {
  for (const profit of [0, -100000, NaN, undefined])
    assert.deepEqual(calculateShare(profit), {
      pool: 0,
      annual: 0,
      quarterly: 0,
    });
});
test("price formatting uses USD notation independent of language", () => {
  assert.equal(money(100000), "$100,000");
  assert.equal(money(62.5, 2), "$62.5");
});
test("language defaults to RU and supports a shareable query and static EN entry", () => {
  assert.equal(getLanguage(""), "ru");
  assert.equal(getLanguage("?lang=en"), "en");
  assert.equal(getLanguage("?lang=de"), "ru");
  assert.equal(getLanguage("?other=x&lang=ru"), "ru");
  assert.equal(getLanguage("", "/en.html"), "en");
  assert.equal(getLanguage("?lang=ru", "/en.html"), "ru");
});
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shape(v)]),
    );
  return typeof value;
}
test("every Russian copy key has an English counterpart", () =>
  assert.deepEqual(shape(content.ru), shape(content.en)));
test("game stages match studio brief", () => {
  for (const language of ["ru", "en"])
    assert.deepEqual(
      content[language].games.map((g) => g.stage),
      ["beta", "prototype", "prototype", "alpha"],
    );
});
