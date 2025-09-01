import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TextNoteElement } from './TextNoteElement';
import { DrawingElement } from './DrawingElement';
import { DrawingTool } from './DrawingTool';
import type { 
  AnyCanvasElement,
  TextNote,
  Drawing,
  CreateTextNoteInput,
  CreateDrawingInput,
  UpdateTextNoteInput,
  UpdateDrawingInput,
  CanvasViewport
} from '../../../server/src/schema';
import type { CanvasMode } from '../App';

interface InfiniteCanvasProps {
  elements: AnyCanvasElement[];
  selectedElementId: string | null;
  mode: CanvasMode;
  viewport: CanvasViewport;
  onElementSelect: (elementId: string | null) => void;
  onElementUpdate: (elementId: string, updates: Partial<UpdateTextNoteInput | UpdateDrawingInput>) => void;
  onCreateTextNote: (input: CreateTextNoteInput) => Promise<TextNote>;
  onCreateDrawing: (input: CreateDrawingInput) => Promise<Drawing>;
  onViewportChange: (viewport: CanvasViewport) => void;
}

export function InfiniteCanvas({
  elements,
  selectedElementId,
  mode,
  viewport,
  onElementSelect,
  onElementUpdate,
  onCreateTextNote,
  onCreateDrawing,
  onViewportChange,
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragElement, setDragElement] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Handle canvas click for creating elements
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'select' || isPanning || isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    if (mode === 'text') {
      const textInput: CreateTextNoteInput = {
        position: { x: canvasX, y: canvasY },
        size: { width: 200, height: 100 },
        content: 'New Note',
        font_size: 16,
        font_color: '#000000',
        background_color: '#ffff88',
        z_index: elements.length,
      };
      onCreateTextNote(textInput);
    }
    // Drawing is handled by DrawingTool component
  }, [mode, viewport, elements.length, onCreateTextNote, isPanning, isDragging]);

  // Handle panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) { // Middle mouse or space+click
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      e.preventDefault();
    }
  }, [viewport, isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      onViewportChange({ ...viewport, x: newX, y: newY });
    }
  }, [isPanning, panStart, viewport, onViewportChange]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragElement(null);
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(0.1, Math.min(3, viewport.zoom + delta));
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Zoom towards mouse position
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomRatio = newZoom / viewport.zoom;
    const newX = mouseX - (mouseX - viewport.x) * zoomRatio;
    const newY = mouseY - (mouseY - viewport.y) * zoomRatio;

    onViewportChange({
      ...viewport,
      zoom: newZoom,
      x: newX,
      y: newY,
    });
  }, [viewport, onViewportChange]);

  // Handle element dragging
  const handleElementMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    if (mode !== 'select') return;
    
    e.stopPropagation();
    onElementSelect(elementId);
    
    const element = elements.find((el: AnyCanvasElement) => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const mouseY = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    
    setDragElement({
      id: elementId,
      offset: {
        x: mouseX - element.position.x,
        y: mouseY - element.position.y,
      },
    });
    setIsDragging(true);
  }, [mode, elements, viewport, onElementSelect]);

  const handleElementDrag = useCallback((e: React.MouseEvent) => {
    if (!dragElement || !isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const mouseY = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    const newX = mouseX - dragElement.offset.x;
    const newY = mouseY - dragElement.offset.y;

    onElementUpdate(dragElement.id, {
      position: { x: newX, y: newY },
    });
  }, [dragElement, isDragging, viewport, onElementUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(true);
        e.preventDefault();
      }
      if (e.key === 'v' || e.key === 'V') onElementSelect(null);
      if (e.key === 't' || e.key === 'T') onElementSelect(null);
      if (e.key === 'd' || e.key === 'D') onElementSelect(null);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElementId, onElementSelect]);

  // Sort elements by z-index for proper rendering order
  const sortedElements = [...elements].sort((a: AnyCanvasElement, b: AnyCanvasElement) => a.z_index - b.z_index);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative cursor-crosshair overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={(e: React.MouseEvent) => {
        handleMouseMove(e);
        handleElementDrag(e);
      }}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      style={{
        cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : mode === 'select' ? 'default' : 'crosshair'
      }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(#ccc 1px, transparent 1px),
            linear-gradient(90deg, #ccc 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x % (20 * viewport.zoom)}px ${viewport.y % (20 * viewport.zoom)}px`,
        }}
      />

      {/* Canvas elements */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {sortedElements.map((element: AnyCanvasElement) => (
          <div key={element.id}>
            {element.type === 'text_note' ? (
              <TextNoteElement
                element={element as TextNote}
                isSelected={element.id === selectedElementId}
                onMouseDown={(e: React.MouseEvent) => handleElementMouseDown(element.id, e)}
                onUpdate={(updates: Partial<UpdateTextNoteInput>) => onElementUpdate(element.id, updates)}
              />
            ) : element.type === 'drawing' ? (
              <DrawingElement
                element={element as Drawing}
                isSelected={element.id === selectedElementId}
                onMouseDown={(e: React.MouseEvent) => handleElementMouseDown(element.id, e)}
                onUpdate={(updates: Partial<UpdateDrawingInput>) => onElementUpdate(element.id, updates)}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Drawing tool overlay */}
      {mode === 'draw' && (
        <DrawingTool
          viewport={viewport}
          onCreateDrawing={onCreateDrawing}
          zIndex={elements.length}
        />
      )}

      {/* Viewport info */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Position: ({Math.round(viewport.x)}, {Math.round(viewport.y)})
      </div>
    </div>
  );
}