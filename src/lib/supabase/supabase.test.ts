import { describe, expect, it } from "vitest";
import { looksLikeSecretKey } from "./config";
import { safeNext } from "./redirect";

const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.y`;

describe("safeNext", () => {
  it("keeps redirects on this site", () => {
    expect(safeNext("/profile")).toBe("/profile");
    expect(safeNext("/practice?x=1")).toBe("/practice?x=1");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});

describe("looksLikeSecretKey", () => {
  it("catches admin keys, allows public ones", () => {
    expect(looksLikeSecretKey("sb_secret_abc")).toBe(true);
    expect(looksLikeSecretKey(jwt("service_role"))).toBe(true);
    expect(looksLikeSecretKey(jwt("anon"))).toBe(false);
    expect(looksLikeSecretKey("sb_publishable_abc")).toBe(false);
  });
});
