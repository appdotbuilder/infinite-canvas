import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type CreateTextNoteInput, type CreateDrawingInput } from '../schema';
import { deleteCanvasElement } from '../handlers/delete_canvas_element';
import { eq } from 'drizzle-orm';

// Test data
const testTextNoteInput: CreateTextNoteInput = {
  position: { x: 100, y: 200 },
  size: { width: 300, height: 150 },
  content: 'Test text note for deletion',
  font_size: 18,
  font_color: '#333333',
  background_color: '#ffeeaa',
  z_index: 5,
};

const testDrawingInput: CreateDrawingInput = {
  position: { x: 50, y: 75 },
  size: { width: 400, height: 300 },
  strokes: [
    {
      points: [
        { x: 10, y: 20, pressure: 0.8 },
        { x: 30, y: 40, pressure: 0.9 },
        { x: 50, y: 60, pressure: 0.7 },
      ],
      color: '#ff0000',
      width: 3,
    },
  ],
  z_index: 2,
};

// Helper functions to create test elements
async function createTestTextNote(): Promise<string> {
  // Insert canvas element
  const elementResult = await db.insert(canvasElementsTable)
    .values({
      type: 'text_note',
      position_x: testTextNoteInput.position.x.toString(),
      position_y: testTextNoteInput.position.y.toString(),
      width: testTextNoteInput.size.width.toString(),
      height: testTextNoteInput.size.height.toString(),
      z_index: testTextNoteInput.z_index,
      data: {},
    })
    .returning()
    .execute();

  const elementId = elementResult[0].id;

  // Insert text note data
  await db.insert(textNotesTable)
    .values({
      id: elementId,
      content: testTextNoteInput.content,
      font_size: testTextNoteInput.font_size.toString(),
      font_color: testTextNoteInput.font_color,
      background_color: testTextNoteInput.background_color,
    })
    .execute();

  return elementId;
}

async function createTestDrawing(): Promise<string> {
  // Insert canvas element
  const elementResult = await db.insert(canvasElementsTable)
    .values({
      type: 'drawing',
      position_x: testDrawingInput.position.x.toString(),
      position_y: testDrawingInput.position.y.toString(),
      width: testDrawingInput.size.width.toString(),
      height: testDrawingInput.size.height.toString(),
      z_index: testDrawingInput.z_index,
      data: {},
    })
    .returning()
    .execute();

  const elementId = elementResult[0].id;

  // Insert drawing data
  await db.insert(drawingsTable)
    .values({
      id: elementId,
      strokes: testDrawingInput.strokes,
    })
    .execute();

  return elementId;
}

describe('deleteCanvasElement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a text note element', async () => {
    // Create test text note
    const elementId = await createTestTextNote();

    // Delete the element
    const result = await deleteCanvasElement(elementId);

    // Verify returned data
    expect(result.id).toEqual(elementId);
    expect(result.type).toEqual('text_note');
    expect(result.position.x).toEqual(100);
    expect(result.position.y).toEqual(200);
    expect(result.size.width).toEqual(300);
    expect(result.size.height).toEqual(150);
    expect(result.z_index).toEqual(5);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify text note specific data
    expect((result as any).content).toEqual('Test text note for deletion');
    expect((result as any).font_size).toEqual(18);
    expect(typeof (result as any).font_size).toBe('number');
    expect((result as any).font_color).toEqual('#333333');
    expect((result as any).background_color).toEqual('#ffeeaa');
  });

  it('should delete a drawing element', async () => {
    // Create test drawing
    const elementId = await createTestDrawing();

    // Delete the element
    const result = await deleteCanvasElement(elementId);

    // Verify returned data
    expect(result.id).toEqual(elementId);
    expect(result.type).toEqual('drawing');
    expect(result.position.x).toEqual(50);
    expect(result.position.y).toEqual(75);
    expect(result.size.width).toEqual(400);
    expect(result.size.height).toEqual(300);
    expect(result.z_index).toEqual(2);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify drawing specific data
    expect((result as any).strokes).toEqual(testDrawingInput.strokes);
    expect((result as any).strokes).toHaveLength(1);
    expect((result as any).strokes[0].points).toHaveLength(3);
  });

  it('should remove element from canvas_elements table', async () => {
    // Create test text note
    const elementId = await createTestTextNote();

    // Verify element exists before deletion
    const beforeDeletion = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, elementId))
      .execute();
    expect(beforeDeletion).toHaveLength(1);

    // Delete the element
    await deleteCanvasElement(elementId);

    // Verify element is removed from canvas_elements table
    const afterDeletion = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, elementId))
      .execute();
    expect(afterDeletion).toHaveLength(0);
  });

  it('should cascade delete text note data', async () => {
    // Create test text note
    const elementId = await createTestTextNote();

    // Verify text note data exists before deletion
    const beforeDeletion = await db.select()
      .from(textNotesTable)
      .where(eq(textNotesTable.id, elementId))
      .execute();
    expect(beforeDeletion).toHaveLength(1);

    // Delete the element
    await deleteCanvasElement(elementId);

    // Verify text note data is cascade deleted
    const afterDeletion = await db.select()
      .from(textNotesTable)
      .where(eq(textNotesTable.id, elementId))
      .execute();
    expect(afterDeletion).toHaveLength(0);
  });

  it('should cascade delete drawing data', async () => {
    // Create test drawing
    const elementId = await createTestDrawing();

    // Verify drawing data exists before deletion
    const beforeDeletion = await db.select()
      .from(drawingsTable)
      .where(eq(drawingsTable.id, elementId))
      .execute();
    expect(beforeDeletion).toHaveLength(1);

    // Delete the element
    await deleteCanvasElement(elementId);

    // Verify drawing data is cascade deleted
    const afterDeletion = await db.select()
      .from(drawingsTable)
      .where(eq(drawingsTable.id, elementId))
      .execute();
    expect(afterDeletion).toHaveLength(0);
  });

  it('should throw error when element does not exist', async () => {
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

    // Attempt to delete non-existent element
    expect(deleteCanvasElement(nonExistentId)).rejects.toThrow(/not found/i);
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create test text note
    const elementId = await createTestTextNote();

    // Delete and verify numeric conversions
    const result = await deleteCanvasElement(elementId);

    // Verify all numeric fields are properly converted to numbers
    expect(typeof result.position.x).toBe('number');
    expect(typeof result.position.y).toBe('number');
    expect(typeof result.size.width).toBe('number');
    expect(typeof result.size.height).toBe('number');
    expect(typeof (result as any).font_size).toBe('number');

    // Verify values are correct
    expect(result.position.x).toEqual(100);
    expect(result.position.y).toEqual(200);
    expect(result.size.width).toEqual(300);
    expect(result.size.height).toEqual(150);
    expect((result as any).font_size).toEqual(18);
  });

  it('should delete multiple elements independently', async () => {
    // Create multiple test elements
    const textNoteId = await createTestTextNote();
    const drawingId = await createTestDrawing();

    // Delete text note
    const deletedTextNote = await deleteCanvasElement(textNoteId);
    expect(deletedTextNote.type).toEqual('text_note');

    // Verify drawing still exists
    const remainingElements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, drawingId))
      .execute();
    expect(remainingElements).toHaveLength(1);

    // Delete drawing
    const deletedDrawing = await deleteCanvasElement(drawingId);
    expect(deletedDrawing.type).toEqual('drawing');

    // Verify no elements remain
    const allElements = await db.select()
      .from(canvasElementsTable)
      .execute();
    expect(allElements).toHaveLength(0);
  });
});