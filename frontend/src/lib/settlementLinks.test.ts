import { describe, expect, it } from "vitest";
import {
  buildSettlementPayments,
  cleanPaymentHandle,
  paypalMeUrl,
  venmoProfileUrl,
} from "./settlementLinks";

describe("settlement link helpers", () => {
  it("builds debtor to creditor payment suggestions", () => {
    expect(
      buildSettlementPayments([
        { name: "A", paid: 30, fair_share: 15, net: 15, venmo_handle: "@camp-a" },
        { name: "B", paid: 5, fair_share: 15, net: -10 },
        { name: "C", paid: 10, fair_share: 15, net: -5 },
      ])
    ).toEqual([
      { from: "B", to: "A", amount: 10, venmo_handle: "@camp-a", paypal_me: undefined },
      { from: "C", to: "A", amount: 5, venmo_handle: "@camp-a", paypal_me: undefined },
    ]);
  });

  it("normalizes pasted handles and profile URLs", () => {
    expect(cleanPaymentHandle("@RowanC")).toBe("RowanC");
    expect(cleanPaymentHandle("https://paypal.me/RowanC/20")).toBe("RowanC");
    expect(cleanPaymentHandle("https://venmo.com/u/RowanC?txn=pay")).toBe("RowanC");
  });

  it("creates PayPal.Me amount links", () => {
    expect(paypalMeUrl("RowanC", 12.5)).toBe("https://paypal.me/RowanC/12.50");
  });

  it("creates Venmo profile links", () => {
    expect(venmoProfileUrl("@RowanC")).toBe("https://venmo.com/u/RowanC");
  });
});
