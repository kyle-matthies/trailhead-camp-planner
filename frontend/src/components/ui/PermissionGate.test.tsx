import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PermissionGate from "@/components/ui/PermissionGate";

describe("PermissionGate", () => {
  it("renders children when the role meets the minimum", () => {
    render(
      <PermissionGate role="counselor" min="cit">
        <span>write-control</span>
      </PermissionGate>
    );
    expect(screen.getByText("write-control")).toBeInTheDocument();
  });

  it("hides children (renders fallback) when the role is below the minimum", () => {
    render(
      <PermissionGate role="camper" min="counselor" fallback={<span>read-only</span>}>
        <span>write-control</span>
      </PermissionGate>
    );
    expect(screen.queryByText("write-control")).toBeNull();
    expect(screen.getByText("read-only")).toBeInTheDocument();
  });
});
