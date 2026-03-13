/**
 * Serial protocol for communicating with the Waveshare display.
 */

import { SerialPort } from "serialport";

const FRAME_MAGIC = Buffer.from("DWBP");
const CMD_MAGIC = Buffer.from("DCMD");
const BAUD_RATE = 921600;
const CHUNK_SIZE = 4096;
const RESPONSE_OK = 0x01;

export const CMD_OFF = 0x00;
export const CMD_ON = 0x01;

function readByte(port: SerialPort, timeout = 5000): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      port.removeListener("data", onData);
      resolve(null);
    }, timeout);

    function onData(data: Buffer) {
      clearTimeout(timer);
      port.removeListener("data", onData);
      resolve(data[0]);
    }

    port.on("data", onData);
  });
}

function write(port: SerialPort, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    port.write(data, (err) => {
      if (err) return reject(err);
      port.drain((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export async function connect(portPath: string): Promise<SerialPort> {
  const port = new SerialPort({ path: portPath, baudRate: BAUD_RATE });
  await new Promise<void>((resolve, reject) => {
    port.on("open", () => {
      setTimeout(() => {
        port.flush();
        resolve();
      }, 100);
    });
    port.on("error", reject);
  });
  return port;
}

export async function sendCommand(
  port: SerialPort,
  cmd: number,
): Promise<boolean> {
  await write(port, Buffer.concat([CMD_MAGIC, Buffer.from([cmd])]));
  const response = await readByte(port);
  return response === RESPONSE_OK;
}

export async function sendFrame(
  port: SerialPort,
  data: Buffer,
): Promise<boolean> {
  const header = Buffer.alloc(12);
  FRAME_MAGIC.copy(header, 0);
  header.writeUInt32LE(data.length, 4);
  header.writeUInt16LE(CHUNK_SIZE, 8);
  header.writeUInt16LE(0, 10);

  await write(port, header);
  const headerResponse = await readByte(port);
  if (headerResponse !== RESPONSE_OK) return false;

  let offset = 0;
  while (offset < data.length) {
    const end = Math.min(offset + CHUNK_SIZE, data.length);
    await write(port, data.subarray(offset, end));
    const chunkResponse = await readByte(port);
    if (chunkResponse !== RESPONSE_OK) return false;
    offset = end;
  }

  const finalResponse = await readByte(port);
  return finalResponse === RESPONSE_OK;
}

export function disconnect(port: SerialPort): Promise<void> {
  return new Promise((resolve) => {
    port.close(() => resolve());
  });
}
