import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { getCanvasElement } from '../handlers/get_canvas_element';

describe('getCanvasElement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a text note element', async () => {
    // Create a text note element manually for testing
    const canvasElement = await db.insert(canvasElementsTable)
      .values({
        type: 'text_note',
        position_x: '10.5',
        position_y: '20.75',
        width: '200',
        height: '100',
        z_index: 5,
        data: {},
      })
      .returning()
      .execute();

    const elementId = canvasElement[0].id;

    await db.insert(textNotesTable)
      .values({
        id: elementId,
        content: 'Test note content',
        font_size: '18',
        font_color: '#ff0000',
        background_color: '#ffff00',
      })
      .execute();

    // Test retrieval
    const result = await getCanvasElement(elementId);

    expect(result.id).toEqual(elementId);
    expect(result.type).toEqual('text_note');
    expect(result.position.x).toEqual(10.5);
    expect(result.position.y).toEqual(20.75);
    expect(result.size.width).toEqual(200);
    expect(result.size.height).toEqual(100);
    expect(result.z_index).toEqual(5);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric type conversions
    expect(typeof result.position.x).toBe('number');
    expect(typeof result.position.y).toBe('number');
    expect(typeof result.size.width).toBe('number');
    expect(typeof result.size.height).toBe('number');

    // Type-specific assertions for text note
    if (result.type === 'text_note') {
      expect(result.content).toEqual('Test note content');
      expect(result.font_size).toEqual(18);
      expect(result.font_color).toEqual('#ff0000');
      expect(result.background_color).toEqual('#ffff00');
      expect(typeof result.font_size).toBe('number');
    }
  });

  it('should retrieve a drawing element', async () => {
    // Create test strokes data
    const testStrokes = [
      {
        points: [
          { x: 0, y: 0, pressure: 1 },
          { x: 10, y: 10, pressure: 0.8 }
        ],
        color: '#ff0000',
        width: 3
      },
      {
        points: [
          { x: 20, y: 20 },
          { x: 30, y: 30 }
        ],
        color: '#00ff00',
        width: 2
      }
    ];

    // Create a drawing element manually for testing
    const canvasElement = await db.insert(canvasElementsTable)
      .values({
        type: 'drawing',
        position_x: '50.25',
        position_y: '75.5',
        width: '300',
        height: '150',
        z_index: 10,
        data: {},
      })
      .returning()
      .execute();

    const elementId = canvasElement[0].id;

    await db.insert(drawingsTable)
      .values({
        id: elementId,
        strokes: testStrokes,
      })
      .execute();

    // Test retrieval
    const result = await getCanvasElement(elementId);

    expect(result.id).toEqual(elementId);
    expect(result.type).toEqual('drawing');
    expect(result.position.x).toEqual(50.25);
    expect(result.position.y).toEqual(75.5);
    expect(result.size.width).toEqual(300);
    expect(result.size.height).toEqual(150);
    expect(result.z_index).toEqual(10);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric type conversions
    expect(typeof result.position.x).toBe('number');
    expect(typeof result.position.y).toBe('number');
    expect(typeof result.size.width).toBe('number');
    expect(typeof result.size.height).toBe('number');

    // Type-specific assertions for drawing
    if (result.type === 'drawing') {
      expect(result.strokes).toEqual(testStrokes);
    }
  });

  it('should throw error when element does not exist', async () => {
    const nonExistentId = '12345678-1234-1234-1234-123456789012';

    await expect(getCanvasElement(nonExistentId))
      .rejects.toThrow(/not found/i);
  });

  it('should throw error when text note data is missing', async () => {
    // Create canvas element without corresponding text note data
    const canvasElement = await db.insert(canvasElementsTable)
      .values({
        type: 'text_note',
        position_x: '0',
        position_y: '0',
        width: '100',
        height: '50',
        z_index: 0,
        data: {},
      })
      .returning()
      .execute();

    const elementId = canvasElement[0].id;

    await expect(getCanvasElement(elementId))
      .rejects.toThrow(/text note data not found/i);
  });

  it('should throw error when drawing data is missing', async () => {
    // Create canvas element without corresponding drawing data
    const canvasElement = await db.insert(canvasElementsTable)
      .values({
        type: 'drawing',
        position_x: '0',
        position_y: '0',
        width: '100',
        height: '50',
        z_index: 0,
        data: {},
      })
      .returning()
      .execute();

    const elementId = canvasElement[0].id;

    await expect(getCanvasElement(elementId))
      .rejects.toThrow(/drawing data not found/i);
  });

  it('should handle complex stroke data correctly', async () => {
    // Test with complex stroke data including optional pressure values
    const complexStrokes = [
      {
        points: [
          { x: 0, y: 0, pressure: 0.5 },
          { x: 5, y: 5 },
          { x: 10, y: 8, pressure: 0.9 },
          { x: 15, y: 12, pressure: 0.3 }
        ],
        color: '#123456',
        width: 4.5
      }
    ];

    const canvasElement = await db.insert(canvasElementsTable)
      .values({
        type: 'drawing',
        position_x: '0',
        position_y: '0',
        width: '100',
        height: '100',
        z_index: 0,
        data: {},
      })
      .returning()
      .execute();

    const elementId = canvasElement[0].id;

    await db.insert(drawingsTable)
      .values({
        id: elementId,
        strokes: complexStrokes,
      })
      .execute();

    const result = await getCanvasElement(elementId);

    expect(result.type).toEqual('drawing');
    
    // Type-specific assertions for drawing
    if (result.type === 'drawing') {
      expect(result.strokes).toEqual(complexStrokes);
      expect(result.strokes[0].points[0].pressure).toEqual(0.5);
      expect(result.strokes[0].points[1].pressure).toBeUndefined();
      expect(result.strokes[0].points[2].pressure).toEqual(0.9);
    }
  });
});