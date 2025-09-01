import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer, 
  Type, 
  Pen, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw 
} from 'lucide-react';
import type { CanvasMode } from '../App';

interface ToolbarProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  selectedElementId: string | null;
  onDeleteElement: (elementId: string) => void;
}

export function Toolbar({ 
  mode, 
  onModeChange, 
  selectedElementId, 
  onDeleteElement 
}: ToolbarProps) {
  const handleDeleteSelected = () => {
    if (selectedElementId) {
      onDeleteElement(selectedElementId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 flex items-center space-x-1">
      {/* Mode selection tools */}
      <div className="flex items-center space-x-1">
        <Button
          variant={mode === 'select' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('select')}
          className="p-2"
          title="Select Tool (V)"
        >
          <MousePointer className="h-4 w-4" />
        </Button>

        <Button
          variant={mode === 'text' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('text')}
          className="p-2"
          title="Text Tool (T)"
        >
          <Type className="h-4 w-4" />
        </Button>

        <Button
          variant={mode === 'draw' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange('draw')}
          className="p-2"
          title="Drawing Tool (D)"
        >
          <Pen className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Element actions */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={!selectedElementId}
          className="p-2"
          title="Delete Selected (Delete)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View controls */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          title="Zoom In (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          title="Zoom Out (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          title="Reset View (R)"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Active tool indicator */}
      <div className="text-xs text-gray-500 px-2">
        {mode === 'select' && '🖱️ Select'}
        {mode === 'text' && '📝 Text'}
        {mode === 'draw' && '✏️ Draw'}
      </div>
    </div>
  );
}