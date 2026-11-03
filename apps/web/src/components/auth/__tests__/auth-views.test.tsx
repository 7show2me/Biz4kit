import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderInRouter } from "@/test-utils";

import { DeviceList } from "../device-list";
import type { DeviceRow } from "../device-list";
import { InviteAcceptView } from "../invite-accept-view";
import { ReauthDialog } from "../reauth-dialog";
import { SignInView } from "../sign-in-view";
import { TransferOwnership } from "../transfer-ownership";

describe("SignInView", () => {
  it("offers Continue with Google and calls the handler", async () => {
    const onGoogle = vi.fn();
    await renderInRouter(<SignInView onGoogle={onGoogle} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" })
    );
    expect(onGoogle).toHaveBeenCalledTimes(1);
  });

  it("is Google only: no password field (locked screen, D94)", async () => {
    await renderInRouter(<SignInView onGoogle={vi.fn()} />);
    expect(screen.queryByLabelText(/password/iu)).toBeNull();
  });

  it("has the invite code and new business links", async () => {
    await renderInRouter(<SignInView onGoogle={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: "I have an invite code" })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start a new business" })
    ).toBeTruthy();
  });

  it("disables the button while signing in", async () => {
    await renderInRouter(<SignInView onGoogle={vi.fn()} pending />);
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toHaveProperty("disabled", true);
  });

  it("says when Google sign-in is not set up", async () => {
    await renderInRouter(
      <SignInView googleEnabled={false} onGoogle={vi.fn()} />
    );
    expect(screen.getByText(/not set up/iu)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toHaveProperty("disabled", true);
  });
});

describe("InviteAcceptView", () => {
  it("sends the trimmed code", async () => {
    const onSubmit = vi.fn();
    await renderInRouter(<InviteAcceptView onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Invite code"), "  AB12  ");
    await userEvent.click(
      screen.getByRole("button", { name: "Join workspace" })
    );
    expect(onSubmit).toHaveBeenCalledWith("AB12");
  });

  it("does not send an empty code", async () => {
    const onSubmit = vi.fn();
    await renderInRouter(<InviteAcceptView onSubmit={onSubmit} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Join workspace" })
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/enter/iu);
  });

  it("prefills the code from the link", async () => {
    await renderInRouter(
      <InviteAcceptView initialCode="XYZ" onSubmit={vi.fn()} />
    );
    expect(screen.getByLabelText("Invite code")).toHaveProperty("value", "XYZ");
  });

  it("shows an error from the server", async () => {
    await renderInRouter(
      <InviteAcceptView error="Code not found." onSubmit={vi.fn()} />
    );
    expect(screen.getByRole("alert").textContent).toBe("Code not found.");
  });
});

const devices: DeviceRow[] = [
  {
    current: true,
    id: "s1",
    lastActive: "2026-11-04T10:00:00Z",
    name: "Chrome on Windows",
    phone: false,
  },
  {
    current: false,
    id: "s2",
    lastActive: "2026-11-03T08:30:00Z",
    name: "Chrome on Android",
    phone: true,
  },
];

describe("DeviceList", () => {
  it("lists every signed-in device", () => {
    render(<DeviceList devices={devices} onRevoke={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("marks this device and gives it no Sign out button", () => {
    render(<DeviceList devices={devices} onRevoke={vi.fn()} />);
    const [mine] = screen.getAllByRole("listitem");
    expect(within(mine).getByText("This device")).toBeTruthy();
    expect(within(mine).queryByRole("button")).toBeNull();
  });

  it("signs out another device by id", async () => {
    const onRevoke = vi.fn();
    render(<DeviceList devices={devices} onRevoke={onRevoke} />);
    const [, other] = screen.getAllByRole("listitem");
    await userEvent.click(
      within(other).getByRole("button", { name: /Sign out/u })
    );
    expect(onRevoke).toHaveBeenCalledWith("s2");
  });

  it("shows an empty line when there are no devices", () => {
    render(<DeviceList devices={[]} onRevoke={vi.fn()} />);
    expect(screen.getByText(/No signed-in devices/u)).toBeTruthy();
  });
});

describe("ReauthDialog", () => {
  it("asks to sign in again and confirms with Google", async () => {
    const onConfirm = vi.fn();
    render(
      <ReauthDialog
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
        open
        reason="Transfer ownership"
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Transfer ownership/u)).toBeTruthy();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Continue with Google" })
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <ReauthDialog
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open={false}
        reason="Delete"
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TransferOwnership", () => {
  const members = [
    { id: "m1", name: "Asha Test", role: "Manager" },
    { id: "m2", name: "Ravi Test", role: "Staff" },
  ];

  it("asks for re-auth first when the session is stale", async () => {
    const onNeedReauth = vi.fn();
    render(
      <TransferOwnership
        fresh={false}
        members={members}
        onNeedReauth={onNeedReauth}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
    expect(onNeedReauth).toHaveBeenCalledTimes(1);
  });

  it("shows the rules as not decided yet, and sends nothing (BIZ-93)", async () => {
    render(
      <TransferOwnership fresh members={members} onNeedReauth={vi.fn()} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
    expect(screen.getByText(/rules are not decided/iu)).toBeTruthy();
  });

  it("lists members as recipients without choosing one for the user", async () => {
    render(
      <TransferOwnership fresh members={members} onNeedReauth={vi.fn()} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
    const select = screen.getByLabelText("New Owner");
    expect(select).toHaveProperty("value", "");
    expect(within(select).getAllByRole("option")).toHaveLength(3);
  });
});
