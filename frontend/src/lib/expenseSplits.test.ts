import { describe, expect, it } from "vitest";
import {
  allocateEvenSplitDrafts,
  buildCustomSplitRows,
  sumSplitDraftCents,
  type SplitTarget,
} from "./expenseSplits";

const targets: SplitTarget[] = [
  { id: "a", kind: "party", label: "A" },
  { id: "b", kind: "party", label: "B" },
  { id: "c", kind: "party", label: "C" },
];

describe("cost split helpers", () => {
  it("allocates even splits without losing cents", () => {
    const drafts = allocateEvenSplitDrafts(10, targets);

    expect(drafts).toEqual({ a: "3.34", b: "3.33", c: "3.33" });
    expect(sumSplitDraftCents(drafts)).toBe(1000);
  });

  it("builds custom split rows when drafts match the expense amount", () => {
    expect(buildCustomSplitRows(20, { a: "15", b: "5", c: "" }, targets)).toEqual([
      { id: "a", kind: "party", amount: 15 },
      { id: "b", kind: "party", amount: 5 },
    ]);
  });

  it("rejects custom split drafts that do not add up", () => {
    expect(() => buildCustomSplitRows(20, { a: "12", b: "5" }, targets, "item")).toThrow(
      "Custom split amounts must add up to the item amount"
    );
  });

  it("rejects invalid split amounts", () => {
    expect(() => buildCustomSplitRows(20, { a: "20", b: "-1" }, targets)).toThrow(
      "Split amounts must be valid"
    );
  });
});
