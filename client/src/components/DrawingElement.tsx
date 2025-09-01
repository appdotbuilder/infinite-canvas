import React, { useRef, useEffect } from 'react';
import type { Drawing, UpdateDrawingInput } from '../../../server/src/schema';

interface DrawingElementProps {
  element: Drawing;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<UpdateDrawingInput>) => void;
}

export function DrawingElement({ 
  element, 
  isSelected, 
  onMouseDown
}: DrawingElementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render strokes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each stroke
    element.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      // Move to first point
      const firstPoint = stroke.points[0];
      if (firstPoint) {
        ctx.moveTo(firstPoint.x, firstPoint.y);

        // Draw lines to subsequent points
        for (let i = 1; i < stroke.points.length; i++) {
          const point = stroke.points[i];
          if (point) {
            ctx.lineTo(point.x, point.y);
          }
        }
      }

      ctx.stroke();
    });
  }, [element.strokes]);

  return (
    <div
      className={`absolute select-none ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        zIndex: element.z_index,
      }}
      onMouseDown={onMouseDown}
    >
      <canvas
        ref={canvasRef}
        width={element.size.width}
        height={element.size.height}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded pointer-events-none" />
      )}
    </div>
  );
}