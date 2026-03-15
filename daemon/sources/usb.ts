/**
 * USB hotplug source — watches udevadm monitor for USB device add/remove.
 * Pushes a notification via the notify screen.
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const usbSource: EventSource = ({ show }) => {
  const proc = spawn("udevadm", ["monitor", "--subsystem-match=usb", "--property"], {
    stdio: ["ignore", "pipe", "ignore"],
  });

  let buffer = "";

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 2);

      if (!block.includes("DEVTYPE=usb_device")) continue;

      const action = block.match(/ACTION=(\w+)/)?.[1];
      if (action !== "add" && action !== "remove") continue;

      const product = block.match(/ID_MODEL_FROM_DATABASE=(.+)/)?.[1]
        ?? block.match(/ID_MODEL=(.+)/)?.[1]
        ?? "USB Device";
      const vendor = block.match(/ID_VENDOR_FROM_DATABASE=(.+)/)?.[1]
        ?? block.match(/ID_VENDOR=(.+)/)?.[1]
        ?? "";

      const name = vendor ? `${vendor} ${product}` : product;
      const summary = action === "add" ? "USB Connected" : "USB Removed";

      setNotification({ app: "udev", summary, body: name, icon: "usb" });
      console.log(`[usb] ${action}: ${name}`);
      show({ name: "notify", params: {} });
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
