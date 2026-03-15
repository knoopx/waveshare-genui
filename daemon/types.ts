import type { ReactElement } from "react";

export type Priority = "low" | "normal" | "high";

export interface Screen {
  name: string;
  priority: Priority;
  element: ReactElement;
}

export interface Context {
  lat: number;
  lon: number;
  city: string;
}

/** Params passed from config rules to screen builders. */
export type ScreenParams = Record<string, string>;

export type ScreenBuilder = (ctx: Context, params: ScreenParams) => Promise<Screen | null>;

/** A screen entry: name + optional params. */
export interface ScreenEntry {
  name: string;
  params: ScreenParams;
}

/** Display control actions. */
export interface DisplayControl {
  show: (entry: ScreenEntry) => void;
  displayOn: () => void;
  displayOff: () => void;
}

/** Event source: watches system state, controls the display. */
export type EventSource = (ctl: DisplayControl) => () => void;
