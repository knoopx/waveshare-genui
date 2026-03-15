/**
 * Disks source — monitors UDisks2 for mount/unmount events via dbus.
 * Shows disk screen when a filesystem is added or removed.
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const disksSource: EventSource = ({ show }) => {
  const proc = spawn("dbus-monitor", [
    "--system",
    "type='signal',interface='org.freedesktop.DBus.ObjectManager'",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);

      if (line.includes("member=InterfacesAdded") && buffer.includes("filesystem")) {
        console.log("[disks] filesystem mounted");
        setNotification({ app: "UDisks", summary: "Drive Mounted", body: "A filesystem was mounted", icon: "disk" });
        show({ name: "disk", params: {} });
      } else if (line.includes("member=InterfacesRemoved") && buffer.includes("block_devices")) {
        console.log("[disks] device removed");
        setNotification({ app: "UDisks", summary: "Drive Removed", body: "A storage device was removed", icon: "disk" });
        show({ name: "notify", params: {} });
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
