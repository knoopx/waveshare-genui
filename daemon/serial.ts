/**
 * Serial protocol using raw file I/O — no native modules, works in Bun.
 *
 * Uses stty to configure the port, then reads/writes via Bun.file and fd.
 */

import { execSync } from "child_process";
import { openSync, closeSync, readSync, writeSync } from "fs";

const FRAME_MAGIC = Buffer.from("DWBP");
const CMD_MAGIC = Buffer.from("DCMD");
const BAUD_RATE = 921600;
const CHUNK_SIZE = 4096;
const RESPONSE_OK = 0x01;

export const PRIO_LOW = 0x00;
export const PRIO_NORMAL = 0x01;
export const PRIO_HIGH = 0x02;

export interface SerialConn {
  fd: number;
  path: string;
}

function configureTty(path: string): void {
  execSync(`stty -F ${path} ${BAUD_RATE} raw -echo -echoe -echok -echoctl -echoke`, {
    timeout: 3000,
  });
}

function writeFd(fd: number, data: Buffer): void {
  let offset = 0;
  while (offset < data.length) {
    const written = writeSync(fd, data, offset, data.length - offset);
    offset += written;
  }
}

function readByte(fd: number, timeoutMs = 5000): number | null {
  const buf = Buffer.alloc(1);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const n = readSync(fd, buf, 0, 1, null);
      if (n === 1) return buf[0];
    } catch (err: any) {
      // EAGAIN / EWOULDBLOCK — retry
      if (err.code === "EAGAIN" || err.code === "EWOULDBLOCK") {
        // busy-wait with a short yield
        Bun.sleepSync(1);
        continue;
      }
      throw err;
    }
    Bun.sleepSync(1);
  }
  return null;
}

export function connect(path: string): SerialConn {
  configureTty(path);
  // O_RDWR | O_NOCTTY | O_NONBLOCK = 0x2 | 0x100 | 0x800
  const fd = openSync(path, "r+");
  // Small settle time after open
  Bun.sleepSync(50);
  return { fd, path };
}

export function disconnect(conn: SerialConn): void {
  try {
    closeSync(conn.fd);
  } catch { /* ignore */ }
}

export function sendCommand(conn: SerialConn, cmd: number): boolean {
  writeFd(conn.fd, Buffer.concat([CMD_MAGIC, Buffer.from([cmd])]));
  const response = readByte(conn.fd);
  return response === RESPONSE_OK;
}

export function sendFrame(conn: SerialConn, data: Buffer, priority: number = PRIO_NORMAL): boolean {
  const header = Buffer.alloc(12);
  FRAME_MAGIC.copy(header, 0);
  header.writeUInt32LE(data.length, 4);
  header.writeUInt16LE(CHUNK_SIZE, 8);
  header[10] = priority;
  header[11] = 0;

  writeFd(conn.fd, header);
  const headerResponse = readByte(conn.fd);
  if (headerResponse !== RESPONSE_OK) return false;

  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + CHUNK_SIZE, data.length);
    writeFd(conn.fd, data.subarray(offset, end));
    const chunkResponse = readByte(conn.fd);
    if (chunkResponse !== RESPONSE_OK) return false;
    offset = end;
  }

  const finalResponse = readByte(conn.fd);
  return finalResponse === RESPONSE_OK;
}
