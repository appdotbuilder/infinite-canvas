import React, { useState, useCallback, useEffect } from 'react';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { Toolbar } from '@/components/Toolbar';
import { trpc } from '@/utils/trpc';
import type { 
  AnyCanvasElement, 
  TextNote, 
  Drawing, 
  CreateTextNoteInput, 
  CreateDrawingInput,
  UpdateTextNoteInput,
  UpdateDrawingInput,
  CanvasViewport 
} from '../../server/src/schema';

export type CanvasMode = 'select' | 'text' | 'draw';

function App() {
  const [elements, setElements] = useState<AnyCanvasElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    zoom: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load canvas elements on mount and viewport changes
  const loadElements = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await trpc.getCanvasElements.query(viewport);
      setElements(response.elements);
    } catch (error) {
      console.error('Failed to load canvas elements:', error);
      // For demo purposes with stub backend, use empty array
      setElements([]);
    } finally {
      setIsLoading(false);
    }
  }, [viewport]);

  useEffect(() => {
    loadElements();
  }, [loadElements]);

  const createTextNote = useCallback(async (input: CreateTextNoteInput) => {
    try {
      const textNote = await trpc.createTextNote.mutate(input);
      setElements((prev: AnyCanvasElement[]) => [...prev, textNote]);
      return textNote;
    } catch (error) {
      console.error('Failed to create text note:', error);
      // Stub fallback for development
      const stubNote: TextNote = {
        id: `note-${Date.now()}`,
        type: 'text_note',
        position: input.position,
        size: input.size,
        z_index: input.z_index,
        content: input.content,
        font_size: input.font_size,
        font_color: input.font_color,
        background_color: input.background_color,
        created_at: new Date(),
        updated_at: new Date(),
      };
      setElements((prev: AnyCanvasElement[]) => [...prev, stubNote]);
      return stubNote;
    }
  }, []);

  const createDrawing = useCallback(async (input: CreateDrawingInput) => {
    try {
      const drawing = await trpc.createDrawing.mutate(input);
      setElements((prev: AnyCanvasElement[]) => [...prev, drawing]);
      return drawing;
    } catch (error) {
      console.error('Failed to create drawing:', error);
      // Stub fallback for development
      const stubDrawing: Drawing = {
        id: `drawing-${Date.now()}`,
        type: 'drawing',
        position: input.position,
        size: input.size,
        z_index: input.z_index,
        strokes: input.strokes,
        created_at: new Date(),
        updated_at: new Date(),
      };
      setElements((prev: AnyCanvasElement[]) => [...prev, stubDrawing]);
      return stubDrawing;
    }
  }, []);

  const updateElement = useCallback(async (elementId: string, updates: Partial<UpdateTextNoteInput | UpdateDrawingInput>) => {
    const element = elements.find((el: AnyCanvasElement) => el.id === elementId);
    if (!element) return;

    try {
      let updatedElement: AnyCanvasElement;
      
      if (element.type === 'text_note') {
        updatedElement = await trpc.updateTextNote.mutate({ 
          id: elementId, 
          ...updates 
        } as UpdateTextNoteInput);
      } else {
        updatedElement = await trpc.updateDrawing.mutate({ 
          id: elementId, 
          ...updates 
        } as UpdateDrawingInput);
      }

      setElements((prev: AnyCanvasElement[]) => 
        prev.map((el: AnyCanvasElement) => el.id === elementId ? updatedElement : el)
      );
    } catch (error) {
      console.error('Failed to update element:', error);
      // Stub fallback - update locally only
      setElements((prev: AnyCanvasElement[]) => 
        prev.map((el: AnyCanvasElement) => 
          el.id === elementId 
            ? { 
                ...el, 
                ...updates, 
                updated_at: new Date() 
              } as AnyCanvasElement
            : el
        )
      );
    }
  }, [elements]);

  const deleteElement = useCallback(async (elementId: string) => {
    try {
      await trpc.deleteCanvasElement.mutate(elementId);
      setElements((prev: AnyCanvasElement[]) => prev.filter((el: AnyCanvasElement) => el.id !== elementId));
    } catch (error) {
      console.error('Failed to delete element:', error);
      // Stub fallback - delete locally only
      setElements((prev: AnyCanvasElement[]) => prev.filter((el: AnyCanvasElement) => el.id !== elementId));
    }
    setSelectedElementId(null);
  }, []);

  const handleViewportChange = useCallback((newViewport: CanvasViewport) => {
    setViewport(newViewport);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-50">
        <Toolbar
          mode={mode}
          onModeChange={setMode}
          selectedElementId={selectedElementId}
          onDeleteElement={deleteElement}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-50 bg-white rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm text-gray-600">Loading canvas...</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <InfiniteCanvas
        elements={elements}
        selectedElementId={selectedElementId}
        mode={mode}
        viewport={viewport}
        onElementSelect={setSelectedElementId}
        onElementUpdate={updateElement}
        onCreateTextNote={createTextNote}
        onCreateDrawing={createDrawing}
        onViewportChange={handleViewportChange}
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-50 bg-white rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-sm mb-2">🎨 Canvas Instructions</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Select:</strong> Click elements to select/move</p>
          <p><strong>Text:</strong> Click anywhere to create notes</p>
          <p><strong>Draw:</strong> Click and drag to draw</p>
          <p><strong>Pan:</strong> Middle click + drag or Space + drag</p>
          <p><strong>Zoom:</strong> Mouse wheel</p>
        </div>
      </div>
    </div>
  );
}

export default App;