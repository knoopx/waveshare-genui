#!/usr/bin/env bun
/**
 * Generate deterministic component screenshots from mock JSX data.
 *
 * These use hardcoded sample data so screenshots are reproducible
 * without network access.
 */

import React from "react";
import { resolve } from "path";
import { mkdirSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { toOpenUILang } from "../src/openui-emitter";
import * as _C from "../src/components/openui";
import { UI } from "../src/tokens";

// DefinedComponent objects work as JSX element types at runtime — the emitter
// traverses the tree structurally without calling them. Cast the import so
// TypeScript accepts them in JSX position.
const C = _C as unknown as Record<string, React.FC<any>>;
const {
  Canvas, Header, Row, Col, Text, Icon, Badge, Card,
  Separator, Spacer, Table, TableCol, List, ListItem, Gauge,
  ProgressBar, Sparkline, StatusDot, Timestamp, QRCode, Image,
  KeyValue, Stat, Alert, EmptyState, CodeBlock, Steps, StepsItem,
  Tag, TagBlock,
} = C;

const GENUI_DIR = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(GENUI_DIR, "..");
const OUT_COMPONENTS = resolve(REPO_ROOT, "screenshots/components");
mkdirSync(OUT_COMPONENTS, { recursive: true });

/** Resolve flake output binary once, then reuse it for all screenshots. */
function resolveGenuiBin(): string {
  const buildArgs = ["build", ".#waveshare-genui", "--no-link", "--print-out-paths"];
  const buildArgsFallback = ["build", "path:.#waveshare-genui", "--no-link", "--print-out-paths"];

  try {
    const out = execFileSync("nix", buildArgs, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" }).trim();
    if (!out) throw new Error("empty nix build output");
    return resolve(out, "bin/waveshare-genui");
  } catch {
    const out = execFileSync("nix", buildArgsFallback, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" }).trim();
    if (!out) throw new Error("empty nix build output (fallback)");
    return resolve(out, "bin/waveshare-genui");
  }
}

const GENUI_BIN = resolveGenuiBin();

/** Render via flake output so fonts/assets match packaged CLI behavior. */
function renderWithFlake(outDir: string, name: string, jsx: React.ReactElement): number {
  const pngPath = resolve(outDir, `${name}.png`);
  const oui = `${toOpenUILang(jsx)}\n`;

  execFileSync(GENUI_BIN, ["-", "-o", pngPath, "--rotate", "0"], {
    cwd: REPO_ROOT,
    input: oui,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return Math.floor(statSync(pngPath).size / 1024);
}

// ─── Component screenshots ──────────────────────────────────────────────

const COMPONENTS: Record<string, React.ReactElement> = {
  "header": (
    <Canvas>
      <Header icon="home" title="Page Title" subtitle="Optional subtitle" />
      <Timestamp />
    </Canvas>
  ),

  "text": (
    <Canvas>
      <Col gap="md">
        <Text size="3xl" weight="bold">3xl bold</Text>
        <Text size="2xl">2xl default</Text>
        <Text size="xl" color="accent">xl accent</Text>
        <Text size="lg" color="green">lg green</Text>
        <Text size="md" color="muted">md muted (default size)</Text>
        <Text size="sm" color="red">sm red</Text>
        <Text size="xs" color="cyan">xs cyan</Text>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "badge-icon": (
    <Canvas>
      <Col gap="lg">
        <Row gap="sm" align="center" wrap={true}>
          <Badge label="default" />
          <Badge label="green" color="green" />
          <Badge label="red" color="red" />
          <Badge label="yellow" color="yellow" />
          <Badge label="cyan" color="cyan" />
          <Badge label="orange" color="orange" />
          <Badge label="purple" color="purple" />
          <Badge label="muted" color="muted" />
        </Row>
        <Separator />
        <Row gap="lg" align="center">
          <Icon name="check" color="green" size="lg" />
          <Icon name="warning" color="yellow" size="lg" />
          <Icon name="error" color="red" size="lg" />
          <Icon name="home" color="accent" size="lg" />
          <Icon name="calendar" color="cyan" size="lg" />
          <Icon name="music" color="purple" size="lg" />
          <Icon name="lightbulb" color="orange" size="lg" />
        </Row>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "card": (
    <Canvas>
      <Col gap="md">
        <Card>
          <Text size="md" weight="bold">{'variant="card" (default)'}</Text>
          <Text size="sm" color="muted">Elevated background with rounded corners.</Text>
        </Card>
        <Card variant="sunk">
          <Text size="md" weight="bold">{'variant="sunk"'}</Text>
          <Text size="sm" color="muted">Recessed background with border.</Text>
        </Card>
        <Card variant="clear">
          <Text size="md" weight="bold">{'variant="clear"'}</Text>
          <Text size="sm" color="muted">Transparent, padding only.</Text>
        </Card>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "stack": (
    <Canvas>
      <Col gap="lg">
        <Text size="sm" color="muted">Row with gap and alignment</Text>
        <Row gap="md" align="center" justify="between">
          <Badge label="start" color="accent" />
          <Badge label="middle" color="green" />
          <Badge label="end" color="purple" />
        </Row>
        <Separator />
        <Text size="sm" color="muted">Row with wrap</Text>
        <Row gap="sm" align="center" wrap={true}>
          <Badge label="A" color="accent" />
          <Badge label="B" color="green" />
          <Badge label="C" color="red" />
          <Badge label="D" color="cyan" />
          <Badge label="E" color="orange" />
          <Badge label="F" color="purple" />
          <Badge label="G" color="yellow" />
          <Badge label="H" color="muted" />
        </Row>
        <Separator />
        <Text size="sm" color="muted">Column with stretch</Text>
        <Row gap="md" align="stretch">
          <Card>
            <Text size="md">Left</Text>
          </Card>
          <Card>
            <Text size="md">Center</Text>
            <Text size="sm" color="muted">More content</Text>
          </Card>
          <Card>
            <Text size="md">Right</Text>
          </Card>
        </Row>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "alert": (
    <Canvas>
      <Col gap="md">
        <Alert title="Information" message="System update available for installation." icon="info" color="cyan" />
        <Alert title="Success" message="All 42 tests passed successfully." icon="check" color="green" />
        <Alert title="Warning" message="Disk usage is above 90%." icon="warning" color="yellow" />
        <Alert title="Error" message="Connection to database failed." icon="error" color="red" />
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "emptystate": (
    <Canvas>
      <EmptyState title="No results found" message="Try adjusting your search filters or check back later." icon="search" color="muted" />
      <Timestamp />
    </Canvas>
  ),

  "keyvalue": (
    <Canvas>
      <Header icon="settings" title="Settings" />
      <Col>
        <Col gap="sm">
          <KeyValue label="Version" value="1.4.2" />
          <Separator />
          <KeyValue label="Environment" value="Production" color="green" />
          <Separator />
          <KeyValue label="Region" value="eu-west-1" secondary="Frankfurt, Germany" />
          <Separator />
          <KeyValue label="Last Deploy" value="2h ago" secondary="v1.4.2-rc.3" color="accent" />
          <Separator />
          <KeyValue label="Uptime" value="14d 6h" color="cyan" />
        </Col>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "stat": (
    <Canvas>
      <Col gap="md">
        <Row gap="md" align="stretch">
          <Stat label="Revenue" value="$24.8k" helper="+12% vs last week" color="green" />
          <Stat label="Orders" value="182" helper="14 pending" color="accent" />
        </Row>
        <Row gap="md" align="stretch">
          <Stat label="Latency" value="142" unit="ms" helper="p95" color="yellow" />
          <Stat label="Errors" value="3" helper="last hour" color="red" />
        </Row>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "table": (
    <Canvas>
      <Header icon="table" title="Table" />
      <Col>
        <Table
          columns={[<TableCol label="Name" />, <TableCol label="Role" />, <TableCol label="Status" />]}
          rows={[
            ["Alice", "Backend", "Active"],
            ["Bob", "Frontend", "Active"],
            ["Carol", "DevOps", "On Leave"],
            ["Dave", "QA", "Active"],
            ["Eve", "Design", "Active"],
            ["Frank", "Backend", "Inactive"],
          ]}
        />
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "list": (
    <Canvas>
      <Header icon="list" title="List" />
      <Col>
        <List>
          <ListItem text="With icon and value" secondary="Secondary text" icon="cart" value="42" />
          <ListItem text="With icon only" secondary="Another description" icon="git" />
          <ListItem text="With value only" value="!" />
          <ListItem text="Plain item" secondary="Just text and secondary" />
          <ListItem text="Minimal item" />
        </List>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "gauge": (
    <Canvas>
      <Row gap="xl" align="center" justify="center" wrap={true}>
        <Gauge label="CPU" value={73} max={100} unit="%" />
        <Gauge label="RAM" value={4.2} max={8} unit="GB" />
        <Gauge label="Disk" value={120} max={500} unit="GB" />
        <Gauge label="Temp" value={62} max={100} unit="°C" color="orange" />
      </Row>
      <Timestamp />
    </Canvas>
  ),

  "progressbar": (
    <Canvas>
      <Col gap="lg">
        <ProgressBar label="Build" value={100} max={100} display="complete" color="green" />
        <ProgressBar label="Tests" value={42} max={50} display="42/50" color="accent" />
        <ProgressBar label="Deploy" value={30} max={100} display="30%" color="orange" />
        <ProgressBar label="Rollback" value={5} max={100} display="5%" color="red" />
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "sparkline": (
    <Canvas>
      <Col gap="lg">
        <Col gap="xs">
          <Text size="sm" color="muted">Revenue (green)</Text>
          <Sparkline values={[10, 25, 18, 30, 22, 35, 28, 42, 38, 50]} color="green" height={60} />
        </Col>
        <Col gap="xs">
          <Text size="sm" color="muted">Errors (red)</Text>
          <Sparkline values={[5, 3, 8, 2, 6, 4, 9, 3, 7, 1]} color="red" height={60} />
        </Col>
        <Col gap="xs">
          <Text size="sm" color="muted">Latency (accent)</Text>
          <Sparkline values={[120, 135, 128, 142, 138, 155, 145, 160, 150, 142]} color="accent" height={60} />
        </Col>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "statusdot": (
    <Canvas>
      <Col gap="md">
        <Row gap="md" align="center">
          <StatusDot up={true} />
          <Text size="md" weight="bold">API Server</Text>
          <Spacer />
          <Badge label="healthy" color="green" />
        </Row>
        <Separator />
        <Row gap="md" align="center">
          <StatusDot up={true} />
          <Text size="md" weight="bold">Database</Text>
          <Spacer />
          <Badge label="healthy" color="green" />
        </Row>
        <Separator />
        <Row gap="md" align="center">
          <StatusDot up={false} />
          <Text size="md" weight="bold">CDN</Text>
          <Spacer />
          <Badge label="DOWN" color="red" />
        </Row>
        <Separator />
        <Row gap="md" align="center">
          <StatusDot up={true} />
          <Text size="md" weight="bold">Cache</Text>
          <Spacer />
          <Badge label="degraded" color="yellow" />
        </Row>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "codeblock": (
    <Canvas>
      <Col gap="md">
        <CodeBlock language="typescript" codeString={`interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction greet(user: User): string {\n  return \`Hello, \${user.name}!\`;\n}`} />
        <CodeBlock language="bash" codeString={`$ bun test\n 214 pass, 0 fail\n 484 expect() calls\n Ran 214 tests in 77ms`} />
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "steps": (
    <Canvas>
      <Header icon="steps" title="Setup Guide" />
      <Col>
        <Steps>
          <StepsItem title="Install dependencies" details="Run bun install in the project root." />
          <StepsItem title="Configure environment" details="Copy .env.example to .env and fill in values." />
          <StepsItem title="Flash firmware" details="Connect the display via USB and run make flash." />
          <StepsItem title="Start development" details="Run bun run dev to launch the dev server." />
        </Steps>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "tagblock": (
    <Canvas>
      <Col gap="lg">
        <Text size="sm" color="muted">With colors</Text>
        <TagBlock>
          <Tag text="TypeScript" icon="code" color="accent" />
          <Tag text="React" icon="react" color="cyan" />
          <Tag text="Rust" icon="rust" color="orange" />
          <Tag text="NixOS" icon="nix" color="purple" />
          <Tag text="ESP32" color="green" />
        </TagBlock>
        <Separator />
        <Text size="sm" color="muted">Minimal</Text>
        <TagBlock>
          <Tag text="bug" color="red" />
          <Tag text="enhancement" color="green" />
          <Tag text="documentation" color="cyan" />
          <Tag text="help wanted" color="yellow" />
          <Tag text="good first issue" color="purple" />
        </TagBlock>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "qrcode": (
    <Canvas>
      <Col>
        <Col gap="lg" align="center" justify="center">
          <QRCode data="https://github.com/knoopx/waveshare-genui" size="lg" />
          <Text size="sm" color="muted">Scan to visit repository</Text>
        </Col>
      </Col>
      <Timestamp />
    </Canvas>
  ),

  "image": (() => {
    const imgPath = resolve(import.meta.dir, "../fixtures/sample.png");
    return (
      <Canvas>
        <Col>
          <Col gap="lg" align="center" justify="center">
            <Image src={imgPath} width={560} height={420} borderRadius={UI.radius.md} />
          </Col>
        </Col>
        <Timestamp />
      </Canvas>
    );
  })(),
};

// ─── Render ─────────────────────────────────────────────────────────────

console.log("Generating component screenshots...\n");

for (const [name, jsx] of Object.entries(COMPONENTS).sort(([a], [b]) => a.localeCompare(b))) {
  const kb = renderWithFlake(OUT_COMPONENTS, name, jsx);
  console.log(`  ${name}.png (${kb} KB)`);
}

console.log("\nDone.");
