import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, drawingsTable } from '../db/schema';
import { type UpdateDrawingInput } from '../schema';
import { updateDrawing } from '../handlers/update_drawing';
import { eq } from 'drizzle-orm';

// Helper function to create a test drawing
async function createTestDrawing() {
  const now = new Date();
  
  // Insert into canvas_elements table
  const elementResult = await db
    .insert(canvasElementsTable)
    .values({
      type: 'drawing',
      position_x: '100.5',
      position_y: '200.25',
      width: '300.0',
      height: '150.75',
      z_index: 1,
      created_at: now,
      updated_at: now,
      data: {},
    })
    .returning()
    .execute();

  const elementId = elementResult[0].id;

  // Insert into drawings table
  const testStrokes = [
    {
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40, pressure: 0.8 },
      ],
      color: '#ff0000',
      width: 3,
    },
  ];

  await db
    .insert(drawingsTable)
    .values({
      id: elementId,
      strokes: testStrokes,
    })
    .execute();

  return {
    id: elementId,
    strokes: testStrokes,
  };
}

describe('updateDrawing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update drawing position', async () => {
    const testDrawing = await createTestDrawing();

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      position: { x: 150.5, y: 250.25 },
    };

    const result = await updateDrawing(updateInput);

    expect(result.id).toEqual(testDrawing.id);
    expect(result.type).toEqual('drawing');
    expect(result.position.x).toEqual(150.5);
    expect(result.position.y).toEqual(250.25);
    expect(result.size.width).toEqual(300.0); // Should remain unchanged
    expect(result.size.height).toEqual(150.75); // Should remain unchanged
    expect(result.z_index).toEqual(1); // Should remain unchanged
    expect(result.strokes).toEqual(testDrawing.strokes); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update drawing size', async () => {
    const testDrawing = await createTestDrawing();

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      size: { width: 400.25, height: 200.5 },
    };

    const result = await updateDrawing(updateInput);

    expect(result.size.width).toEqual(400.25);
    expect(result.size.height).toEqual(200.5);
    expect(result.position.x).toEqual(100.5); // Should remain unchanged
    expect(result.position.y).toEqual(200.25); // Should remain unchanged
    expect(result.z_index).toEqual(1); // Should remain unchanged
    expect(result.strokes).toEqual(testDrawing.strokes); // Should remain unchanged
  });

  it('should update drawing z_index', async () => {
    const testDrawing = await createTestDrawing();

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      z_index: 5,
    };

    const result = await updateDrawing(updateInput);

    expect(result.z_index).toEqual(5);
    expect(result.position.x).toEqual(100.5); // Should remain unchanged
    expect(result.position.y).toEqual(200.25); // Should remain unchanged
    expect(result.size.width).toEqual(300.0); // Should remain unchanged
    expect(result.size.height).toEqual(150.75); // Should remain unchanged
    expect(result.strokes).toEqual(testDrawing.strokes); // Should remain unchanged
  });

  it('should update drawing strokes', async () => {
    const testDrawing = await createTestDrawing();

    const newStrokes = [
      {
        points: [
          { x: 50, y: 60 },
          { x: 70, y: 80, pressure: 0.9 },
          { x: 90, y: 100 },
        ],
        color: '#00ff00',
        width: 5,
      },
      {
        points: [
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
        color: '#0000ff',
        width: 2,
      },
    ];

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      strokes: newStrokes,
    };

    const result = await updateDrawing(updateInput);

    expect(result.strokes).toEqual(newStrokes);
    expect(result.position.x).toEqual(100.5); // Should remain unchanged
    expect(result.position.y).toEqual(200.25); // Should remain unchanged
    expect(result.size.width).toEqual(300.0); // Should remain unchanged
    expect(result.size.height).toEqual(150.75); // Should remain unchanged
    expect(result.z_index).toEqual(1); // Should remain unchanged
  });

  it('should update multiple fields simultaneously', async () => {
    const testDrawing = await createTestDrawing();

    const newStrokes = [
      {
        points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
        color: '#purple',
        width: 1,
      },
    ];

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      position: { x: 500.75, y: 600.25 },
      size: { width: 800.5, height: 400.75 },
      z_index: 10,
      strokes: newStrokes,
    };

    const result = await updateDrawing(updateInput);

    expect(result.position.x).toEqual(500.75);
    expect(result.position.y).toEqual(600.25);
    expect(result.size.width).toEqual(800.5);
    expect(result.size.height).toEqual(400.75);
    expect(result.z_index).toEqual(10);
    expect(result.strokes).toEqual(newStrokes);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should save updates to database', async () => {
    const testDrawing = await createTestDrawing();

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      position: { x: 999.5, y: 888.25 },
      z_index: 99,
    };

    await updateDrawing(updateInput);

    // Verify changes in canvas_elements table
    const canvasElements = await db
      .select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, testDrawing.id))
      .execute();

    expect(canvasElements).toHaveLength(1);
    expect(parseFloat(canvasElements[0].position_x)).toEqual(999.5);
    expect(parseFloat(canvasElements[0].position_y)).toEqual(888.25);
    expect(canvasElements[0].z_index).toEqual(99);
    expect(canvasElements[0].updated_at).toBeInstanceOf(Date);
    
    // Verify strokes remain unchanged in drawings table
    const drawings = await db
      .select()
      .from(drawingsTable)
      .where(eq(drawingsTable.id, testDrawing.id))
      .execute();

    expect(drawings).toHaveLength(1);
    expect(drawings[0].strokes).toEqual(testDrawing.strokes);
  });

  it('should handle empty strokes array', async () => {
    const testDrawing = await createTestDrawing();

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      strokes: [],
    };

    const result = await updateDrawing(updateInput);

    expect(result.strokes).toEqual([]);
    expect(Array.isArray(result.strokes)).toBe(true);
  });

  it('should throw error for non-existent drawing', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const updateInput: UpdateDrawingInput = {
      id: nonExistentId,
      position: { x: 100, y: 200 },
    };

    await expect(updateDrawing(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const testDrawing = await createTestDrawing();

    // Update only position
    const positionUpdate: UpdateDrawingInput = {
      id: testDrawing.id,
      position: { x: 123.45, y: 678.90 },
    };

    const result1 = await updateDrawing(positionUpdate);
    expect(result1.position.x).toEqual(123.45);
    expect(result1.position.y).toEqual(678.90);
    expect(result1.size.width).toEqual(300.0); // Unchanged
    expect(result1.z_index).toEqual(1); // Unchanged

    // Update only size
    const sizeUpdate: UpdateDrawingInput = {
      id: testDrawing.id,
      size: { width: 987.65, height: 432.10 },
    };

    const result2 = await updateDrawing(sizeUpdate);
    expect(result2.size.width).toEqual(987.65);
    expect(result2.size.height).toEqual(432.10);
    expect(result2.position.x).toEqual(123.45); // From previous update
    expect(result2.position.y).toEqual(678.90); // From previous update
    expect(result2.z_index).toEqual(1); // Unchanged
  });

  it('should update updated_at timestamp', async () => {
    const testDrawing = await createTestDrawing();
    
    // Get the original updated_at
    const originalElements = await db
      .select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, testDrawing.id))
      .execute();
    
    const originalUpdatedAt = originalElements[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateDrawingInput = {
      id: testDrawing.id,
      z_index: 42,
    };

    const result = await updateDrawing(updateInput);

    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});