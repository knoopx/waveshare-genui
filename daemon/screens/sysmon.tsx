import React from "react";
import { execSync } from "child_process";
import { hostname } from "os";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Row, Col, Gauge, Separator, List, ListItem, Timestamp,
} from "../ui";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 3000 }).toString().trim();
}

export async function sysmonScreen(_ctx: Context, _params: ScreenParams): Promise<Screen> {
  // CPU
  const cpuIdle = parseFloat(
    sh("top -bn2 -d0.5 | grep 'Cpu(s)' | tail -1 | awk '{print $8}'"),
  );
  const cpu = Math.round(100 - cpuIdle);

  // Memory
  const memInfo = sh("free -m | awk '/Mem:/{print $2,$3}'").split(" ");
  const ramTotal = parseFloat(memInfo[0]);
  const ramUsed = parseFloat(memInfo[1]);
  const ramPct = Math.round((ramUsed / ramTotal) * 100);

  // Disk
  const diskInfo = sh("df -BG / | awk 'NR==2{print $2,$3}'").split(" ");
  const diskTotal = parseInt(diskInfo[0]) || 1;
  const diskUsed = parseInt(diskInfo[1]) || 0;
  const diskPct = Math.round((diskUsed / diskTotal) * 100);

  // Temps
  const temps: { label: string; value: number }[] = [];
  try {
    const zones = sh(
      "paste <(cat /sys/class/thermal/thermal_zone*/type) <(cat /sys/class/thermal/thermal_zone*/temp)",
    );
    for (const line of zones.split("\n")) {
      const [type, raw] = line.split("\t");
      if (type && raw) temps.push({ label: type, value: Math.round(parseInt(raw) / 1000) });
    }
  } catch { /* no thermal */ }

  // Uptime
  const uptimeSec = parseFloat(sh("awk '{print $1}' /proc/uptime"));
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const upStr = days > 0 ? `up ${days}d ${hours}h` : `up ${hours}h`;

  // Load
  const load = sh("cat /proc/loadavg | awk '{print $1, \"/\", $2, \"/\", $3}'");

  const stats: { icon: string; text: string }[] = [
    ...temps.map((t) => ({ icon: "thermometer", text: `${t.label}: ${t.value}°C` })),
    { icon: "settings", text: `Load: ${load}` },
  ];

  return {
    name: "sysmon",
    priority: "normal",
    element: (
      <Canvas>
        <Header icon="desktop" title="System Monitor" subtitle={`${hostname()} · ${upStr}`} />
        <Col>
          <Row gap="xl" align="center" justify="center">
            <Gauge label="CPU" value={cpu} max={100} unit="%" size="sm" />
            <Gauge label="Memory" value={ramPct} max={100} unit="%" size="sm" />
            <Gauge
              label="Disk"
              value={diskPct}
              max={100}
              unit="%"
              size="sm"
              color={diskPct > 85 ? "orange" : undefined}
            />
          </Row>
          <Separator />
          <List>
            {stats.map((s) => (
              <ListItem text={s.text} icon={s.icon} />
            ))}
          </List>
        </Col>
        <Timestamp />
      </Canvas>
    ),
  };
}
