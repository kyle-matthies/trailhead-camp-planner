import { describe, it, expect } from "vitest";
import { roleAtLeast } from "@/lib/types";

describe("roleAtLeast (role ladder)", () => {
  it("respects the director > counselor > cit > camper ordering", () => {
    expect(roleAtLeast("director", "counselor")).toBe(true);
    expect(roleAtLeast("counselor", "counselor")).toBe(true);
    expect(roleAtLeast("cit", "counselor")).toBe(false);
    expect(roleAtLeast("camper", "cit")).toBe(false);
    expect(roleAtLeast("cit", "camper")).toBe(true);
  });

  it("treats null/undefined as below everything", () => {
    expect(roleAtLeast(null, "camper")).toBe(false);
    expect(roleAtLeast(undefined, "camper")).toBe(false);
  });
});
