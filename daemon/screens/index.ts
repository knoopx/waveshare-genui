import type { ScreenBuilder } from "../types";
import { clockScreen } from "./clock";
import { sysmonScreen } from "./sysmon";
import { weatherScreen } from "./weather";
import { nowplayingScreen } from "./nowplaying";
import { calendarScreen } from "./calendar";
import { networkScreen } from "./network";
import { processesScreen } from "./processes";
import { diskScreen } from "./disk";
import { vcsScreen } from "./vcs";
import { notifyScreen } from "./notify";
import { mailScreen } from "./mail";
import { audioScreen } from "./audio";
import { containersScreen } from "./containers";
import { prsScreen, ciScreen } from "./github";
import { hackernewsScreen } from "./hackernews";
import { lobstersScreen } from "./lobsters";
import { redditScreen } from "./reddit";
import { departuresScreen } from "./departures";
import { meetingScreen } from "./meeting";
import { summaryScreen } from "./summary";
import { nixosScreen } from "./nixos";
import { stocksScreen } from "./stocks";

export const screens: Record<string, ScreenBuilder> = {
  clock: clockScreen,
  sysmon: sysmonScreen,
  weather: weatherScreen,
  nowplaying: nowplayingScreen,
  calendar: calendarScreen,
  network: networkScreen,
  processes: processesScreen,
  disk: diskScreen,
  vcs: vcsScreen,
  notify: notifyScreen,
  mail: mailScreen,
  audio: audioScreen,
  containers: containersScreen,
  prs: prsScreen,
  ci: ciScreen,
  hackernews: hackernewsScreen,
  lobsters: lobstersScreen,
  reddit: redditScreen,
  departures: departuresScreen,
  meeting: meetingScreen,
  summary: summaryScreen,
  nixos: nixosScreen,
  stocks: stocksScreen,
};
