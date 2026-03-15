import type { EventSource } from "../types";
import { windowSource } from "./window";
import { mediaSource } from "./media";
import { systemSource } from "./system";
import { networkSource } from "./network";
import { notificationSource } from "./notifications";
import { mailSource } from "./mail";
import { calendarSource } from "./calendar";
import { volumeSource } from "./volume";
import { idleSource } from "./idle";
import { clockSource } from "./clock";
import { usbSource } from "./usb";
import { buildSource } from "./build";
import { sleepSource } from "./sleep";
import { screenlockSource } from "./screenlock";
import { disksSource } from "./disks";
import { updatesSource } from "./updates";
import { commuteSource } from "./commute";
import { birthdaySource } from "./birthdays";
import { weatherAlertSource } from "./weather";
import { summarySource } from "./summary";
import { stocksSource } from "./stocks";

export const sources: EventSource[] = [
  windowSource,
  mediaSource,
  systemSource,
  networkSource,
  notificationSource,
  mailSource,
  calendarSource,
  volumeSource,
  idleSource,
  clockSource,
  usbSource,
  buildSource,
  sleepSource,
  screenlockSource,
  disksSource,
  updatesSource,
  commuteSource,
  birthdaySource,
  weatherAlertSource,
  summarySource,
  stocksSource,
];
