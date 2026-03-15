import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { lastNotification } from "../sources/notifications";
import { Canvas, Col, Text, Icon, Separator } from "../ui";

function pickIcon(app: string, icon: string): string {
  const s = `${app} ${icon}`.toLowerCase();
  if (s.includes("firefox") || s.includes("browser")) return "globe";
  if (s.includes("mail") || s.includes("thunderbird") || s.includes("geary")) return "mail";
  if (s.includes("calendar") || s.includes("gnome-calendar")) return "calendar";
  if (s.includes("spotify") || s.includes("music") || s.includes("player")) return "music";
  if (s.includes("slack") || s.includes("discord") || s.includes("chat") || s.includes("telegram")) return "mail";
  if (s.includes("terminal") || s.includes("kitty") || s.includes("alacritty")) return "terminal";
  if (s.includes("warning") || s.includes("dialog-warning")) return "warning";
  if (s.includes("error") || s.includes("dialog-error")) return "error";
  if (s.includes("info") || s.includes("dialog-info")) return "info";
  if (s.includes("check") || s.includes("complete") || s.includes("success")) return "check";
  if (s.includes("download")) return "download";
  if (s.includes("update") || s.includes("upgrade")) return "sync";
  if (s.includes("battery") || s.includes("power")) return "bolt";
  if (s.includes("network") || s.includes("wifi") || s.includes("nm-")) return "wifi";
  if (s.includes("bluetooth")) return "toggle";
  if (s.includes("volume") || s.includes("audio") || s.includes("sound")) return "music";
  if (s.includes("screenshot")) return "camera";
  if (s.includes("usb") || s.includes("disk") || s.includes("mount")) return "disk";
  return "bell";
}

function pickColor(app: string, icon: string): string {
  const s = `${app} ${icon}`.toLowerCase();
  if (s.includes("error") || s.includes("critical") || s.includes("fail")) return "red";
  if (s.includes("warning") || s.includes("battery") || s.includes("low")) return "yellow";
  if (s.includes("success") || s.includes("complete") || s.includes("check")) return "green";
  if (s.includes("download") || s.includes("update") || s.includes("sync")) return "cyan";
  if (s.includes("mail") || s.includes("message") || s.includes("chat")) return "purple";
  return "accent";
}

export async function notifyScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  const n = lastNotification;
  if (!n) return null;

  const icon = pickIcon(n.app, n.icon);
  const color = pickColor(n.app, n.icon);

  return {
    name: "notify",
    priority: "high",
    element: (
      <Canvas>
        <Col align="center" justify="center">
          <Col gap="md" align="center">
            <Icon name={icon} color={color} size="2xl" />
            <Text size="2xl" weight="bold" align="center" color={color}>{n.summary}</Text>
            {n.body ? <Separator /> : null}
            {n.body ? (
              <Text size="xl" color="muted" align="center">{n.body}</Text>
            ) : null}
          </Col>
        </Col>
      </Canvas>
    ),
  };
}
