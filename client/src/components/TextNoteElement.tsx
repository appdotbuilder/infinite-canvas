import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Palette } from 'lucide-react';
import type { TextNote, UpdateTextNoteInput } from '../../../server/src/schema';

interface TextNoteElementProps {
  element: TextNote;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<UpdateTextNoteInput>) => void;
}

export function TextNoteElement({ 
  element, 
  isSelected, 
  onMouseDown, 
  onUpdate 
}: TextNoteElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  }, []);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (editContent !== element.content) {
      onUpdate({ content: editContent });
    }
  }, [editContent, element.content, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditContent(element.content);
      setIsEditing(false);
    }
  }, [element.content, handleSave]);

  const handleColorChange = useCallback((color: string, type: 'background' | 'text') => {
    if (type === 'background') {
      onUpdate({ background_color: color });
    } else {
      onUpdate({ font_color: color });
    }
  }, [onUpdate]);

  const handleFontSizeChange = useCallback((delta: number) => {
    const newSize = Math.max(8, Math.min(72, element.font_size + delta));
    onUpdate({ font_size: newSize });
  }, [element.font_size, onUpdate]);

  const commonColors = [
    '#ffff88', '#ff8888', '#88ff88', '#8888ff', '#ff88ff', '#88ffff',
    '#ffffff', '#f0f0f0', '#d0d0d0', '#a0a0a0', '#808080', '#404040'
  ];

  return (
    <div
      className="absolute select-none"
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        zIndex: element.z_index,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Main note content */}
      <div
        className={`w-full h-full p-3 rounded-lg shadow-md border-2 transition-all ${
          isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent'
        }`}
        style={{
          backgroundColor: element.background_color,
          fontSize: `${element.font_size}px`,
          color: element.font_color,
        }}
      >
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full h-full resize-none border-none bg-transparent p-0 focus:ring-0"
            style={{
              fontSize: `${element.font_size}px`,
              color: element.font_color,
            }}
          />
        ) : (
          <div className="w-full h-full overflow-hidden whitespace-pre-wrap break-words">
            {element.content || 'Click to edit...'}
          </div>
        )}
      </div>

      {/* Selection controls */}
      {isSelected && !isEditing && (
        <div className="absolute -top-12 left-0 flex items-center space-x-2 bg-white rounded-lg shadow-lg p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1"
            title="Colors"
          >
            <Palette className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFontSizeChange(-2)}
              className="p-1 text-xs"
              title="Decrease font size"
            >
              A-
            </Button>
            <span className="text-xs text-gray-500 px-1">{element.font_size}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFontSizeChange(2)}
              className="p-1 text-xs"
              title="Increase font size"
            >
              A+
            </Button>
          </div>
        </div>
      )}

      {/* Color picker */}
      {showColorPicker && isSelected && (
        <div className="absolute -top-24 left-0 bg-white rounded-lg shadow-lg p-3 z-50">
          <div className="mb-2">
            <div className="text-xs font-medium mb-1">Background</div>
            <div className="flex flex-wrap gap-1">
              {commonColors.map((color: string) => (
                <button
                  key={`bg-${color}`}
                  className={`w-6 h-6 rounded border-2 ${
                    element.background_color === color ? 'border-blue-500' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, 'background')}
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium mb-1">Text</div>
            <div className="flex flex-wrap gap-1">
              {['#000000', '#333333', '#666666', '#999999', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color: string) => (
                <button
                  key={`text-${color}`}
                  className={`w-6 h-6 rounded border-2 ${
                    element.font_color === color ? 'border-blue-500' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, 'text')}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}