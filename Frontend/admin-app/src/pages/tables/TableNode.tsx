import { useEffect, useRef } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Circle, Group, Rect, Text } from 'react-konva';
import { TABLE_SHAPE, type CafeTableLayout } from '../../api/tablesApi';
import { SEAT_PIP_COLOR, WOOD_GRADIENT_STOPS, WOOD_TEXT_COLOR, isDisabledStatus, statusAccent } from './statusColors';

const DRAG_COMMIT_DEBOUNCE_MS = 500;
const SELECTED_STROKE = { light: '#356859', dark: '#5AA88E' };

// Seat "pips" are a silhouette hint (a chair-back outline seen from above), not a full
// illustration — capped so a 50-seat banquet table (the form's max) doesn't turn into a
// ring of clutter around a small shape.
const MAX_SEAT_PIPS = 12;
const PIP_OFFSET = 11;
const PIP_WIDTH = 7;
const PIP_HEIGHT = 4;

interface SeatPipPosition {
  x: number;
  y: number;
  rotationDeg: number;
}

// Pips ring the shape's bounding ellipse — for a Circle that's an exact circle; for
// Rectangle/Square it's an ellipse circumscribing the box. Simpler than walking the
// rectangle's literal perimeter and still reads as "seats around the table" at this size.
function seatPipPositions(width: number, height: number, seats: number): SeatPipPosition[] {
  const count = Math.max(0, Math.min(seats, MAX_SEAT_PIPS));
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 + PIP_OFFSET;
  const ry = height / 2 + PIP_OFFSET;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
      rotationDeg: (angle * 180) / Math.PI + 90,
    };
  });
}

interface TableNodeProps {
  table: CafeTableLayout;
  isDark: boolean;
  onClick?: (table: CafeTableLayout) => void;
  draggable?: boolean;
  isSelected?: boolean;
  onDragEnd?: (table: CafeTableLayout, positionX: number, positionY: number) => void;
}

// Group is always positioned at (positionX, positionY) — the top-left of the table's
// bounding box — for every shape, including Circle. This keeps the stored layout
// convention uniform regardless of shape; only the Circle's own x/y (relative to the
// group) is offset to its center, matching Konva's Circle API.
//
// Each table renders as two stacked shapes rather than one flat-colored one: a wood-
// gradient base (shadowed, so it visually sits on the floor) plus a translucent status
// overlay (stroke + ~15-20% opacity fill) on top — so the wood texture stays visible at
// every status instead of being replaced by a solid color.
export function TableNode({ table, isDark, onClick, draggable = false, isSelected = false, onDragEnd }: TableNodeProps) {
  const accent = statusAccent(table.status, isDark);
  const woodStops = isDark ? WOOD_GRADIENT_STOPS.dark : WOOD_GRADIENT_STOPS.light;
  const textColor = isDark ? WOOD_TEXT_COLOR.dark : WOOD_TEXT_COLOR.light;
  const pipColor = isDark ? SEAT_PIP_COLOR.dark : SEAT_PIP_COLOR.light;
  const boxHeight = table.shape === TABLE_SHAPE.Circle ? table.width : table.height;
  const interactive = Boolean(onClick) && !isDisabledStatus(table.status);
  const dragCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (dragCommitTimer.current) clearTimeout(dragCommitTimer.current);
    },
    [],
  );

  const handleClick = () => {
    if (interactive) onClick?.(table);
  };

  const setCursor = (event: KonvaEventObject<MouseEvent>, cursor: string) => {
    const stage = event.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const positionX = event.target.x();
    const positionY = event.target.y();
    if (dragCommitTimer.current) clearTimeout(dragCommitTimer.current);
    // Debounced so a quick sequence of nudges settles into a single PATCH instead of
    // one per drag gesture (spec: "не на каждый пиксель движения").
    dragCommitTimer.current = setTimeout(() => {
      onDragEnd?.(table, positionX, positionY);
    }, DRAG_COMMIT_DEBOUNCE_MS);
  };

  const overlayStroke = isSelected ? (isDark ? SELECTED_STROKE.dark : SELECTED_STROKE.light) : accent.stroke;
  const overlayStrokeWidth = isSelected ? 3 : 1.5;
  const pipPositions = seatPipPositions(table.width, boxHeight, table.seatsCount);

  return (
    <Group
      x={table.positionX}
      y={table.positionY}
      draggable={draggable}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => (interactive || draggable) && setCursor(e, draggable ? 'move' : 'pointer')}
      onMouseLeave={(e) => setCursor(e, 'default')}
      opacity={accent.opacity}
    >
      {table.shape === TABLE_SHAPE.Circle ? (
        <>
          <Circle
            x={table.width / 2}
            y={table.width / 2}
            radius={table.width / 2}
            fillRadialGradientStartPoint={{ x: -table.width * 0.15, y: -table.width * 0.18 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={table.width / 2}
            fillRadialGradientColorStops={woodStops}
            shadowColor="black"
            shadowBlur={12}
            shadowOffsetY={5}
            shadowOpacity={0.28}
          />
          <Circle
            x={table.width / 2}
            y={table.width / 2}
            radius={table.width / 2}
            fill={accent.overlayFill}
            stroke={overlayStroke}
            strokeWidth={overlayStrokeWidth}
            dash={accent.dash}
          />
        </>
      ) : (
        <>
          <Rect
            width={table.width}
            height={table.height}
            cornerRadius={10}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: table.width, y: table.height }}
            fillLinearGradientColorStops={woodStops}
            shadowColor="black"
            shadowBlur={12}
            shadowOffsetY={5}
            shadowOpacity={0.28}
          />
          <Rect
            width={table.width}
            height={table.height}
            cornerRadius={10}
            fill={accent.overlayFill}
            stroke={overlayStroke}
            strokeWidth={overlayStrokeWidth}
            dash={accent.dash}
          />
        </>
      )}

      {pipPositions.map((pip, i) => (
        <Rect
          key={i}
          x={pip.x}
          y={pip.y}
          width={PIP_WIDTH}
          height={PIP_HEIGHT}
          offsetX={PIP_WIDTH / 2}
          offsetY={PIP_HEIGHT / 2}
          rotation={pip.rotationDeg}
          cornerRadius={2}
          fill={pipColor}
          listening={false}
        />
      ))}

      <Text
        text={String(table.tableNumber)}
        width={table.width}
        y={boxHeight / 2 - 13}
        align="center"
        fontFamily="Montserrat, sans-serif"
        fontStyle="700"
        fontSize={17}
        fill={textColor}
        listening={false}
      />
      <Text
        text={`${table.seatsCount} мест`}
        width={table.width}
        y={boxHeight / 2 + 7}
        align="center"
        fontFamily="Montserrat, sans-serif"
        fontSize={11}
        fill={textColor}
        listening={false}
      />
    </Group>
  );
}
