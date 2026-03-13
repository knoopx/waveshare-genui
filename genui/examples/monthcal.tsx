#!/usr/bin/env bun
/**
 * Monthly calendar grid — highlights today.
 *
 * Usage: monthcal.tsx [--month 3] [--year 2026]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Table, Col, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
const now = new Date();
let month = now.getMonth();
let year = now.getFullYear();

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--month" && argv[i + 1]) month = parseInt(argv[++i]) - 1;
  else if (argv[i] === "--year" && argv[i + 1]) year = parseInt(argv[++i]);
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const firstDay = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Monday=0 offset
const offset = (firstDay + 6) % 7;

const weeks: string[][] = [];
let week: string[] = new Array(offset).fill("");
for (let d = 1; d <= daysInMonth; d++) {
  week.push(String(d));
  if (week.length === 7) {
    weeks.push(week);
    week = [];
  }
}
if (week.length > 0) {
  while (week.length < 7) week.push("");
  weeks.push(week);
}

const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

emit(
  <Canvas>
    <Header icon={"\uf073"} title={`${months[month]} ${year}`} />
    <Content>
      <Table
        columns={days.map((d) => <Col label={d} align="center" />)}
        rows={weeks}
      />
    </Content>
    <Timestamp />
  </Canvas>,
);
