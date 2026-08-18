import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MoneyCell from "@/components/ui/MoneyCell";
import { formatMoney } from "@/lib/money";

describe("formatMoney", () => {
  it("formats numbers and handles null", () => {
    expect(formatMoney(3)).toBe("$3.00");
    expect(formatMoney(12.5)).toBe("$12.50");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });
});

describe("MoneyCell estimate-vs-actual rule", () => {
  it("shows the actual cost in the solid 'bought' style when purchased", () => {
    const { container } = render(<MoneyCell estimated={5} actual={6} purchased />);
    expect(screen.getByText("$6.00")).toBeInTheDocument();
    expect(container.querySelector(".text-forest-700")).toBeTruthy();
  });

  it("shows the estimate in muted italic style when not purchased", () => {
    const { container } = render(<MoneyCell estimated={5} actual={null} purchased={false} />);
    const el = screen.getByText("$5.00");
    expect(el).toBeInTheDocument();
    expect(container.querySelector(".italic")).toBeTruthy();
  });

  it("renders a dash when there is no cost", () => {
    render(<MoneyCell estimated={null} actual={null} purchased={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
