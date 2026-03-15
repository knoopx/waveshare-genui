/**
 * Re-exports OpenUI components under short names for use with the emitter.
 * Examples and scripts that call emit() should import from here.
 */
export {
  OUICanvas as Canvas,
  OUIHeader as Header,
  OUIRow as Row,
  OUICol as Col,
  OUICard as Card,
  OUISeparator as Separator,
  OUISpacer as Spacer,
} from "./layout";

export {
  OUIText as Text,
  OUIIcon as Icon,
  OUIBadge as Badge,
  OUIAlert as Alert,
  OUIEmptyState as EmptyState,
  OUITimestamp as Timestamp,
  OUICodeBlock as CodeBlock,
} from "./content";

export {
  OUIKeyValue as KeyValue,
  OUIStat as Stat,
  OUIList as List,
  OUIListItem as ListItem,
  OUITable as Table,
  OUITableCol as TableCol,
  OUISteps as Steps,
  OUIStepsItem as StepsItem,
  OUITagBlock as TagBlock,
  OUITag as Tag,
} from "./data";

export {
  OUIGauge as Gauge,
  OUIProgressBar as ProgressBar,
  OUISparkline as Sparkline,
  OUIStatusDot as StatusDot,
} from "./viz";

export {
  OUIQRCode as QRCode,
  OUIImage as Image,
} from "./media";
