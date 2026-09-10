import { useRef } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Node as KonvaNode } from 'konva/lib/Node';
import { Image as KonvaImage, Layer, Rect, Stage } from 'react-konva';
import type { CafeTableLayout } from '../../api/tablesApi';
import { TableNode } from './TableNode';
import { useZoneBackgroundImage } from './useZoneBackgroundImage';

interface FloorCanvasProps {
  tables: CafeTableLayout[];
  isDark: boolean;
  editing?: boolean;
  selectedTableId?: number | null;
  onTableClick?: (table: CafeTableLayout) => void;
  onTableDragEnd?: (table: CafeTableLayout, positionX: number, positionY: number) => void;
  addArmed?: boolean;
  onCanvasClick?: (positionX: number, positionY: number) => void;
  backgroundImageUrl?: string | null;
}

// Fixed virtual canvas size — large enough for a typical floor plan, with zoom/pan (below)
// covering larger ones instead of dynamic sizing.
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 760;
const ZOOM_STEP = 1.05;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

export function FloorCanvas({
  tables,
  isDark,
  editing = false,
  selectedTableId = null,
  onTableClick,
  onTableDragEnd,
  addArmed = false,
  onCanvasClick,
  backgroundImageUrl = null,
}: FloorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const backgroundImage = useZoneBackgroundImage(backgroundImageUrl);

  // Shared by both onClick (mouse) and onTap (touch) — Konva types each handler against
  // a different EventType generic, but `.target` is a plain Node either way, so the
  // actual logic is factored out to a Node-typed function both inline wrappers can call.
  const handleCanvasPointer = (target: KonvaNode) => {
    if (!addArmed || !onCanvasClick) return;
    const stage = target.getStage();
    if (!stage || target !== stage) return; // ignore clicks that landed on a table
    const pointer = stage.getPointerPosition();
    if (pointer) onCanvasClick(pointer.x, pointer.y);
  };

  // Zoom toward the pointer, in both modes — doesn't conflict with per-table dragging
  // since it's a wheel event, not a pointer drag. The Stage itself is never draggable
  // (below) — click-and-drag on empty background must not pan the scene, only wheel
  // zoom moves the view.
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const targetScale = direction > 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP;
    const newScale = Math.min(Math.max(targetScale, MIN_SCALE), MAX_SCALE);

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  return (
    <div className={`floor-canvas-container ${addArmed ? 'is-add-armed' : ''}`}>
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        draggable={false}
        onWheel={handleWheel}
        onClick={(e) => handleCanvasPointer(e.target)}
        onTap={(e) => handleCanvasPointer(e.target)}
      >
        {/* Static floor layer: a flat theme-toned floor as a fallback/base, with the
            zone's uploaded illustration stretched over it once loaded. `listening={false}`
            on both lets clicks fall through to the Stage so add-table placement keeps
            working (see handleCanvasPointer's `target !== stage` check). */}
        <Layer listening={false}>
          <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={isDark ? '#1E2523' : '#F1F4F2'} />
          {backgroundImage && (
            <KonvaImage image={backgroundImage} x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          )}
        </Layer>
        <Layer>
          {tables.map((table) => (
            <TableNode
              key={table.id}
              table={table}
              isDark={isDark}
              onClick={onTableClick}
              draggable={editing}
              isSelected={selectedTableId === table.id}
              onDragEnd={onTableDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
