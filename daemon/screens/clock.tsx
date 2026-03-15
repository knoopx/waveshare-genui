import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Row, Text, Icon } from "../ui";

export async function clockScreen(_ctx: Context, _params: ScreenParams): Promise<Screen> {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    name: "clock",
    priority: "low",
    element: (
      <Canvas>
        <Col gap="lg" align="stretch" justify="center">
          <Text size="3xl" weight="bold" align="center">{time}</Text>
          <Row gap="sm" align="center" justify="center">
            <Icon name="calendar" color="accent" size="lg" />
            <Text size="lg" color="muted">{date}</Text>
          </Row>
        </Col>
      </Canvas>
    ),
  };
}
