import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DemoWorkspace from "./DemoWorkspace";

describe("DemoWorkspace", () => {
  it("keeps AI suggestions behind an explicit review and apply step", async () => {
    const user = userEvent.setup();
    render(<DemoWorkspace />);

    await user.click(screen.getByRole("button", { name: "AI review flow" }));
    expect(screen.queryByText(/Applied \d reviewed/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate proposal" }));
    const salsa = screen.getByRole("checkbox", {
      name: "Add salsa and limes to shopping",
    });
    await user.click(salsa);
    await user.click(screen.getByRole("button", { name: "Apply selected changes" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Applied 2 reviewed changes to this in-memory demo."
    );

    await user.click(screen.getByRole("button", { name: "Gear & shopping" }));
    expect(screen.getByText("Corn tortillas")).toBeInTheDocument();
    expect(screen.getByText("Black beans")).toBeInTheDocument();
    expect(screen.queryByText("Salsa and limes")).not.toBeInTheDocument();
  });
});
