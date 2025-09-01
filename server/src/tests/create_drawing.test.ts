import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, drawingsTable } from '../db/schema';
import { type CreateDrawingInput } from '../schema';
import { createDrawing } from '../handlers/create_drawing';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateDrawingInput = {
  position: {
    x: 100.5,
    y: 200.25
  },
  size: {
    width: 300,
    height: 150
  },
  strokes: [
    {
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40, pressure: 0.8 },
        { x: 50, y: 60 }
      ],
      color: '#ff0000',
      width: 3
    },
    {
      points: [
        { x: 100, y: 120 },
        { x: 130, y: 140 }
      ],
      color: '#00ff00',
      width: 5
    }
  ],
  z_index: 5
};

describe('createDrawing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a drawing with all fields', async () => {
    const result = await createDrawing(testInput);

    // Validate basic properties
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.type).toBe('drawing');
    expect(result.position.x).toBe(100.5);
    expect(result.position.y).toBe(200.25);
    expect(result.size.width).toBe(300);
    expect(result.size.height).toBe(150);
    expect(result.z_index).toBe(5);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate strokes
    expect(result.strokes).toHaveLength(2);
    expect(result.strokes[0].color).toBe('#ff0000');
    expect(result.strokes[0].width).toBe(3);
    expect(result.strokes[0].points).toHaveLength(3);
    expect(result.strokes[0].points[1].pressure).toBe(0.8);
    expect(result.strokes[1].color).toBe('#00ff00');
    expect(result.strokes[1].width).toBe(5);
  });

  it('should save drawing to canvas_elements table', async () => {
    const result = await createDrawing(testInput);

    const canvasElements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, result.id))
      .execute();

    expect(canvasElements).toHaveLength(1);
    const element = canvasElements[0];
    expect(element.type).toBe('drawing');
    expect(parseFloat(element.position_x)).toBe(100.5);
    expect(parseFloat(element.position_y)).toBe(200.25);
    expect(parseFloat(element.width)).toBe(300);
    expect(parseFloat(element.height)).toBe(150);
    expect(element.z_index).toBe(5);
    expect(element.created_at).toBeInstanceOf(Date);
    expect(element.updated_at).toBeInstanceOf(Date);
  });

  it('should save drawing to drawings table', async () => {
    const result = await createDrawing(testInput);

    const drawings = await db.select()
      .from(drawingsTable)
      .where(eq(drawingsTable.id, result.id))
      .execute();

    expect(drawings).toHaveLength(1);
    const drawing = drawings[0];
    expect(drawing.id).toBe(result.id);
    
    // Verify strokes are properly stored as JSONB
    expect(Array.isArray(drawing.strokes)).toBe(true);
    expect(drawing.strokes).toHaveLength(2);
    
    const strokesData = drawing.strokes as any[];
    expect(strokesData[0].color).toBe('#ff0000');
    expect(strokesData[0].width).toBe(3);
    expect(strokesData[0].points).toHaveLength(3);
    expect(strokesData[1].color).toBe('#00ff00');
    expect(strokesData[1].width).toBe(5);
  });

  it('should handle drawing with default z_index', async () => {
    const inputWithDefaults: CreateDrawingInput = {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      strokes: [{
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        color: '#000000',
        width: 2
      }],
      z_index: 0 // Default value
    };

    const result = await createDrawing(inputWithDefaults);

    expect(result.z_index).toBe(0);
    expect(result.strokes[0].color).toBe('#000000');
    expect(result.strokes[0].width).toBe(2);
  });

  it('should handle precise decimal coordinates', async () => {
    const preciseInput: CreateDrawingInput = {
      position: { x: 123.456789, y: 987.654321 },
      size: { width: 50.123, height: 75.987 },
      strokes: [{
        points: [
          { x: 1.23, y: 4.56 },
          { x: 7.89, y: 10.11, pressure: 0.123456 }
        ],
        color: '#abcdef',
        width: 1.5
      }],
      z_index: -3
    };

    const result = await createDrawing(preciseInput);

    // Check that precision is maintained
    expect(result.position.x).toBe(123.456789);
    expect(result.position.y).toBe(987.654321);
    expect(result.size.width).toBe(50.123);
    expect(result.size.height).toBe(75.987);
    expect(result.z_index).toBe(-3);
    
    // Check stroke precision
    expect(result.strokes[0].points[0].x).toBe(1.23);
    expect(result.strokes[0].points[0].y).toBe(4.56);
    expect(result.strokes[0].points[1].pressure).toBe(0.123456);
    expect(result.strokes[0].width).toBe(1.5);
  });

  it('should handle multiple strokes with different properties', async () => {
    const multiStrokeInput: CreateDrawingInput = {
      position: { x: 10, y: 20 },
      size: { width: 200, height: 300 },
      strokes: [
        {
          points: [{ x: 0, y: 0 }],
          color: '#ff0000',
          width: 1
        },
        {
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
            { x: 30, y: 30, pressure: 1.0 }
          ],
          color: '#00ff00',
          width: 10
        },
        {
          points: [{ x: 100, y: 200, pressure: 0.5 }],
          color: '#0000ff',
          width: 0.5
        }
      ],
      z_index: 1
    };

    const result = await createDrawing(multiStrokeInput);

    expect(result.strokes).toHaveLength(3);
    
    // First stroke
    expect(result.strokes[0].color).toBe('#ff0000');
    expect(result.strokes[0].width).toBe(1);
    expect(result.strokes[0].points).toHaveLength(1);
    
    // Second stroke
    expect(result.strokes[1].color).toBe('#00ff00');
    expect(result.strokes[1].width).toBe(10);
    expect(result.strokes[1].points).toHaveLength(3);
    expect(result.strokes[1].points[2].pressure).toBe(1.0);
    
    // Third stroke
    expect(result.strokes[2].color).toBe('#0000ff');
    expect(result.strokes[2].width).toBe(0.5);
    expect(result.strokes[2].points[0].pressure).toBe(0.5);
  });
});