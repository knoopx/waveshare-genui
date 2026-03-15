// React components (plain React, used in JSX)
export { Canvas, Header, Row, Col, Card, Separator, Spacer } from "./components/react/layout";
export { Text, Icon, Badge, Alert, EmptyState, Timestamp, CodeBlock } from "./components/react/content";
export { KeyValue, Stat, List, Table, Steps, TagBlock } from "./components/react/data";
export type { ListItemData, TableColData, StepData, TagData } from "./components/react/data";
export { Gauge, ProgressBar, Sparkline, StatusDot } from "./components/react/viz";
export { QRCode, Image } from "./components/react/media";

// OpenUI components (defineComponent wrappers, used by library.ts and emitter)
export {
  OUICanvas, OUIHeader, OUIRow, OUICol, OUICard, OUISeparator, OUISpacer,
} from "./components/openui/layout";
export {
  OUIText, OUIIcon, OUIBadge, OUIAlert, OUIEmptyState, OUITimestamp, OUICodeBlock,
} from "./components/openui/content";
export {
  OUIKeyValue, OUIStat, OUIList, OUIListItem, OUITable, OUITableCol, OUISteps, OUIStepsItem, OUITagBlock, OUITag,
} from "./components/openui/data";
export {
  OUIGauge, OUIProgressBar, OUISparkline, OUIStatusDot,
} from "./components/openui/viz";
export {
  OUIQRCode, OUIImage,
} from "./components/openui/media";
