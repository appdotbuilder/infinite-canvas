import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type CreateTextNoteInput, type CreateDrawingInput, type CanvasViewport } from '../schema';
import { getCanvasElements } from '../handlers/get_canvas_elements';

// Test data
const testTextNote: CreateTextNoteInput = {
  position: { x: 100, y: 200 },
  size: { width: 150, height: 100 },
  content: 'Test note content',
  font_size: 18,
  font_color: '#333333',
  background_color: '#ffff99',
  z_index: 1,
};

const testDrawing: CreateDrawingInput = {
  position: { x: 300, y: 400 },
  size: { width: 200, height: 150 },
  strokes: [
    {
      points: [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 10, pressure: 0.8 },
        { x: 20, y: 5, pressure: 0.3 },
      ],
      color: '#ff0000',
      width: 3,
    },
    {
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 60 },
      ],
      color: '#00ff00',
      width: 2,
    },
  ],
  z_index: 2,
};

const testViewport: CanvasViewport = {
  x: 0,
  y: 0,
  width: 500,
  height: 500,
  zoom: 1,
};

// Helper function to create a text note in the database
const createTestTextNote = async (data: CreateTextNoteInput) => {
  // Insert into canvas_elements table
  const canvasResult = await db.insert(canvasElementsTable)
    .values({
      type: 'text_note',
      position_x: data.position.x.toString(),
      position_y: data.position.y.toString(),
      width: data.size.width.toString(),
      height: data.size.height.toString(),
      z_index: data.z_index,
      data: {}, // Empty JSONB data
    })
    .returning()
    .execute();

  // Insert into text_notes table
  await db.insert(textNotesTable)
    .values({
      id: canvasResult[0].id,
      content: data.content,
      font_size: data.font_size.toString(),
      font_color: data.font_color,
      background_color: data.background_color,
    })
    .execute();

  return canvasResult[0].id;
};

// Helper function to create a drawing in the database
const createTestDrawing = async (data: CreateDrawingInput) => {
  // Insert into canvas_elements table
  const canvasResult = await db.insert(canvasElementsTable)
    .values({
      type: 'drawing',
      position_x: data.position.x.toString(),
      position_y: data.position.y.toString(),
      width: data.size.width.toString(),
      height: data.size.height.toString(),
      z_index: data.z_index,
      data: {}, // Empty JSONB data
    })
    .returning()
    .execute();

  // Insert into drawings table
  await db.insert(drawingsTable)
    .values({
      id: canvasResult[0].id,
      strokes: data.strokes,
    })
    .execute();

  return canvasResult[0].id;
};

describe('getCanvasElements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty result when no elements exist', async () => {
    const result = await getCanvasElements();

    expect(result.elements).toEqual([]);
    expect(result.total_count).toEqual(0);
  });

  it('should return all elements when no viewport is specified', async () => {
    // Create test data
    const textNoteId = await createTestTextNote(testTextNote);
    const drawingId = await createTestDrawing(testDrawing);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(2);
    expect(result.total_count).toEqual(2);

    // Should be ordered by z_index (text note has z_index 1, drawing has z_index 2)
    const textNote = result.elements.find(el => el.id === textNoteId);
    const drawing = result.elements.find(el => el.id === drawingId);

    expect(textNote).toBeDefined();
    expect(drawing).toBeDefined();
    expect(result.elements[0].z_index).toBeLessThan(result.elements[1].z_index);
  });

  it('should return correctly formatted text note', async () => {
    const textNoteId = await createTestTextNote(testTextNote);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(1);
    const element = result.elements[0];

    expect(element.id).toEqual(textNoteId);
    expect(element.type).toEqual('text_note');
    expect(element.position).toEqual({ x: 100, y: 200 });
    expect(element.size).toEqual({ width: 150, height: 100 });
    expect(element.z_index).toEqual(1);
    expect(element.created_at).toBeInstanceOf(Date);
    expect(element.updated_at).toBeInstanceOf(Date);

    // Type-specific fields for text note
    if (element.type === 'text_note') {
      expect(element.content).toEqual('Test note content');
      expect(element.font_size).toEqual(18);
      expect(element.font_color).toEqual('#333333');
      expect(element.background_color).toEqual('#ffff99');
    }
  });

  it('should return correctly formatted drawing', async () => {
    const drawingId = await createTestDrawing(testDrawing);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(1);
    const element = result.elements[0];

    expect(element.id).toEqual(drawingId);
    expect(element.type).toEqual('drawing');
    expect(element.position).toEqual({ x: 300, y: 400 });
    expect(element.size).toEqual({ width: 200, height: 150 });
    expect(element.z_index).toEqual(2);

    // Type-specific fields for drawing
    if (element.type === 'drawing') {
      expect(element.strokes).toHaveLength(2);
      expect(element.strokes[0].points).toHaveLength(3);
      expect(element.strokes[0].color).toEqual('#ff0000');
      expect(element.strokes[0].width).toEqual(3);
      expect(element.strokes[1].points).toHaveLength(2);
      expect(element.strokes[1].color).toEqual('#00ff00');
      expect(element.strokes[1].width).toEqual(2);
    }
  });

  it('should filter elements by viewport', async () => {
    // Create elements: one inside viewport, one outside
    const insideNote: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 50, y: 50 }, // Inside viewport (0,0,500,500)
    };
    
    const outsideNote: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 600, y: 600 }, // Outside viewport
      content: 'Outside note',
    };

    const insideId = await createTestTextNote(insideNote);
    await createTestTextNote(outsideNote);

    const result = await getCanvasElements(testViewport);

    expect(result.elements).toHaveLength(1);
    expect(result.total_count).toEqual(1);
    expect(result.elements[0].id).toEqual(insideId);
  });

  it('should handle viewport edge cases correctly', async () => {
    // Create element exactly at viewport boundary
    const boundaryNote: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 0, y: 0 }, // Exactly at viewport top-left
    };

    await createTestTextNote(boundaryNote);

    const result = await getCanvasElements(testViewport);

    expect(result.elements).toHaveLength(1);
    expect(result.total_count).toEqual(1);
  });

  it('should handle overlapping elements correctly', async () => {
    // Create multiple elements with different z-indices
    const bottomElement: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 100, y: 100 },
      content: 'Bottom element',
      z_index: 0,
    };

    const middleElement: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 100, y: 100 },
      content: 'Middle element',
      z_index: 5,
    };

    const topElement: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 100, y: 100 },
      content: 'Top element',
      z_index: 10,
    };

    await createTestTextNote(bottomElement);
    await createTestTextNote(middleElement);
    await createTestTextNote(topElement);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(3);
    expect(result.total_count).toEqual(3);

    // Should be ordered by z_index (ascending)
    expect(result.elements[0].z_index).toEqual(0);
    expect(result.elements[1].z_index).toEqual(5);
    expect(result.elements[2].z_index).toEqual(10);

    // Verify content to ensure proper ordering
    if (result.elements[0].type === 'text_note') {
      expect(result.elements[0].content).toEqual('Bottom element');
    }
    if (result.elements[2].type === 'text_note') {
      expect(result.elements[2].content).toEqual('Top element');
    }
  });

  it('should handle mixed element types with correct ordering', async () => {
    // Create text note with higher z-index
    const highTextNote: CreateTextNoteInput = {
      ...testTextNote,
      z_index: 10,
    };

    // Create drawing with lower z-index
    const lowDrawing: CreateDrawingInput = {
      ...testDrawing,
      z_index: 5,
    };

    const textNoteId = await createTestTextNote(highTextNote);
    const drawingId = await createTestDrawing(lowDrawing);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(2);
    expect(result.total_count).toEqual(2);

    // Drawing should come first (lower z-index)
    expect(result.elements[0].id).toEqual(drawingId);
    expect(result.elements[0].type).toEqual('drawing');
    expect(result.elements[0].z_index).toEqual(5);

    // Text note should come second (higher z-index)
    expect(result.elements[1].id).toEqual(textNoteId);
    expect(result.elements[1].type).toEqual('text_note');
    expect(result.elements[1].z_index).toEqual(10);
  });

  it('should handle numeric precision correctly', async () => {
    // Create element with precise decimal positions
    const preciseNote: CreateTextNoteInput = {
      ...testTextNote,
      position: { x: 123.456789, y: 987.654321 },
      size: { width: 50.123, height: 75.987 },
      font_size: 14.5,
    };

    await createTestTextNote(preciseNote);

    const result = await getCanvasElements();

    expect(result.elements).toHaveLength(1);
    const element = result.elements[0];

    // Verify numeric precision is maintained
    expect(typeof element.position.x).toBe('number');
    expect(typeof element.position.y).toBe('number');
    expect(typeof element.size.width).toBe('number');
    expect(typeof element.size.height).toBe('number');
    
    expect(element.position.x).toBeCloseTo(123.456789);
    expect(element.position.y).toBeCloseTo(987.654321);
    expect(element.size.width).toBeCloseTo(50.123);
    expect(element.size.height).toBeCloseTo(75.987);

    if (element.type === 'text_note') {
      expect(typeof element.font_size).toBe('number');
      expect(element.font_size).toBeCloseTo(14.5);
    }
  });
});