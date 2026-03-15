import type { FC } from "react";
import type { DefinedComponent } from "@openuidev/react-lang";
import {
  Canvas as OUICanvas,
  Header as OUIHeader,
  Row as OUIRow,
  Col as OUICol,
  Card as OUICard,
  Separator as OUISeparator,
  Spacer as OUISpacer,
  Text as OUIText,
  Icon as OUIIcon,
  Badge as OUIBadge,
  Alert as OUIAlert,
  EmptyState as OUIEmptyState,
  Timestamp as OUITimestamp,
  CodeBlock as OUICodeBlock,
  KeyValue as OUIKeyValue,
  Stat as OUIStat,
  List as OUIList,
  ListItem as OUIListItem,
  Table as OUITable,
  TableCol as OUITableCol,
  Steps as OUISteps,
  StepsItem as OUIStepsItem,
  TagBlock as OUITagBlock,
  Tag as OUITag,
  Gauge as OUIGauge,
  ProgressBar as OUIProgressBar,
  Sparkline as OUISparkline,
  StatusDot as OUIStatusDot,
  QRCode as OUIQRCode,
  Image as OUIImage,
} from "./openui";

type OpenUIComponent = FC<any>;

function plain(component: DefinedComponent<any>): OpenUIComponent {
  return component.component as unknown as OpenUIComponent;
}

export const Canvas = plain(OUICanvas);
export const Header = plain(OUIHeader);
export const Row = plain(OUIRow);
export const Col = plain(OUICol);
export const Card = plain(OUICard);
export const Separator = plain(OUISeparator);
export const Spacer = plain(OUISpacer);

export const Text = plain(OUIText);
export const Icon = plain(OUIIcon);
export const Badge = plain(OUIBadge);
export const Alert = plain(OUIAlert);
export const EmptyState = plain(OUIEmptyState);
export const Timestamp = plain(OUITimestamp);
export const CodeBlock = plain(OUICodeBlock);

export const KeyValue = plain(OUIKeyValue);
export const Stat = plain(OUIStat);
export const List = plain(OUIList);
export const ListItem = plain(OUIListItem);
export const Table = plain(OUITable);
export const TableCol = plain(OUITableCol);
export const Steps = plain(OUISteps);
export const StepsItem = plain(OUIStepsItem);
export const TagBlock = plain(OUITagBlock);
export const Tag = plain(OUITag);

export const Gauge = plain(OUIGauge);
export const ProgressBar = plain(OUIProgressBar);
export const Sparkline = plain(OUISparkline);
export const StatusDot = plain(OUIStatusDot);

export const QRCode = plain(OUIQRCode);
export const Image = plain(OUIImage);
