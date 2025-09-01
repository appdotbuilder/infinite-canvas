import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Palette } from 'lucide-react';
import type { 
  CreateDrawingInput, 
  Drawing, 
  CanvasViewport
} from '../../../server/src/schema';

// Local type definitions for drawing components
type StrokePoint = {
  x: number;
  y: number;
  pressure?: number;
};

type Stroke = {
  points: StrokePoint[];
  color: string;
  width: number;
};

interface DrawingToolProps {
  viewport: CanvasViewport;
  onCreateDrawing: (input: CreateDrawingInput) => Promise<Drawing>;
  zIndex: number;
}

export function DrawingTool({ viewport, onCreateDrawing, zIndex }: DrawingToolProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const drawingAreaRef = useRef<HTMLDivElement>(null);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent) => {
    const rect = drawingAreaRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (e.clientX - rect.left - viewport.x) / viewport.zoom,
      y: (e.clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button

    const point = getCanvasCoordinates(e);
    setCurrentStroke([point]);
    setIsDrawing(true);
    e.preventDefault();
  }, [getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;

    const point = getCanvasCoordinates(e);
    setCurrentStroke((prev: StrokePoint[]) => [...prev, point]);
  }, [isDrawing, getCanvasCoordinates]);

  const handleMouseUp = useCallback(async () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    // Calculate bounding box for the stroke
    const minX = Math.min(...currentStroke.map((p: StrokePoint) => p.x));
    const maxX = Math.max(...currentStroke.map((p: StrokePoint) => p.x));
    const minY = Math.min(...currentStroke.map((p: StrokePoint) => p.y));
    const maxY = Math.max(...currentStroke.map((p: StrokePoint) => p.y));

    const padding = strokeWidth + 5;
    const position = {
      x: minX - padding,
      y: minY - padding,
    };
    const size = {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };

    // Adjust stroke points relative to drawing position
    const adjustedPoints = currentStroke.map((p: StrokePoint) => ({
      x: p.x - position.x,
      y: p.y - position.y,
      pressure: p.pressure,
    }));

    const stroke: Stroke = {
      points: adjustedPoints,
      color: strokeColor,
      width: strokeWidth,
    };

    const drawingInput: CreateDrawingInput = {
      position,
      size,
      strokes: [stroke],
      z_index: zIndex,
    };

    try {
      await onCreateDrawing(drawingInput);
    } catch (error) {
      console.error('Failed to create drawing:', error);
    }

    setIsDrawing(false);
    setCurrentStroke([]);
  }, [isDrawing, currentStroke, strokeColor, strokeWidth, zIndex, onCreateDrawing]);

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#808080', '#ffa500', '#800080'
  ];

  return (
    <>
      {/* Drawing area overlay */}
      <div
        ref={drawingAreaRef}
        className="absolute inset-0 z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'crosshair' }}
      >
        {/* Current stroke preview */}
        {isDrawing && currentStroke.length > 1 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <polyline
              points={currentStroke.map((p: StrokePoint) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Drawing tool settings */}
      <div className="absolute top-20 left-4 z-20">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-sm font-medium">✏️ Drawing</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </div>

          {showSettings && (
            <div className="space-y-3">
              {/* Color picker */}
              <div>
                <div className="text-xs font-medium mb-2">Color</div>
                <div className="flex flex-wrap gap-1">
                  {colors.map((color: string) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${
                        strokeColor === color ? 'border-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setStrokeColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke width */}
              <div>
                <div className="text-xs font-medium mb-2">Width: {strokeWidth}px</div>
                <Slider
                  value={[strokeWidth]}
                  onValueChange={(value: number[]) => setStrokeWidth(value[0] || 2)}
                  min={1}
                  max={20}
                  step={1}
                  className="w-32"
                />
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            Click and drag to draw
          </div>
        </div>
      </div>
    </>
  );
}