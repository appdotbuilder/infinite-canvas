import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable } from '../db/schema';
import { type UpdateTextNoteInput, type CreateTextNoteInput } from '../schema';
import { updateTextNote } from '../handlers/update_text_note';
import { eq } from 'drizzle-orm';

// Helper to create a text note for testing
async function createTestTextNote(input: CreateTextNoteInput = {
  position: { x: 100, y: 200 },
  size: { width: 150, height: 80 },
  content: 'Original content',
  font_size: 14,
  font_color: '#333333',
  background_color: '#ffffcc',
  z_index: 1
}) {
  // Insert into canvas_elements first
  const canvasResult = await db.insert(canvasElementsTable)
    .values({
      type: 'text_note',
      position_x: input.position.x.toString(),
      position_y: input.position.y.toString(),
      width: input.size.width.toString(),
      height: input.size.height.toString(),
      z_index: input.z_index,
      data: {}
    })
    .returning()
    .execute();

  // Insert into text_notes
  await db.insert(textNotesTable)
    .values({
      id: canvasResult[0].id,
      content: input.content,
      font_size: input.font_size.toString(),
      font_color: input.font_color,
      background_color: input.background_color
    })
    .execute();

  return canvasResult[0].id;
}

describe('updateTextNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update text note position', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      position: { x: 300, y: 400 }
    };

    const result = await updateTextNote(updateInput);

    expect(result.id).toEqual(noteId);
    expect(result.position.x).toEqual(300);
    expect(result.position.y).toEqual(400);
    expect(result.content).toEqual('Original content'); // Should remain unchanged
    expect(result.font_size).toEqual(14); // Should remain unchanged
  });

  it('should update text note size', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      size: { width: 250, height: 120 }
    };

    const result = await updateTextNote(updateInput);

    expect(result.size.width).toEqual(250);
    expect(result.size.height).toEqual(120);
    expect(result.position.x).toEqual(100); // Should remain unchanged
  });

  it('should update text note content', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      content: 'Updated content here'
    };

    const result = await updateTextNote(updateInput);

    expect(result.content).toEqual('Updated content here');
    expect(result.position.x).toEqual(100); // Should remain unchanged
    expect(result.font_size).toEqual(14); // Should remain unchanged
  });

  it('should update text note styling properties', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      font_size: 18,
      font_color: '#ff0000',
      background_color: '#00ff00'
    };

    const result = await updateTextNote(updateInput);

    expect(result.font_size).toEqual(18);
    expect(result.font_color).toEqual('#ff0000');
    expect(result.background_color).toEqual('#00ff00');
    expect(result.content).toEqual('Original content'); // Should remain unchanged
  });

  it('should update z_index', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      z_index: 5
    };

    const result = await updateTextNote(updateInput);

    expect(result.z_index).toEqual(5);
    expect(result.content).toEqual('Original content'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const noteId = await createTestTextNote();

    const updateInput: UpdateTextNoteInput = {
      id: noteId,
      position: { x: 500, y: 600 },
      size: { width: 300, height: 150 },
      content: 'Multi-field update',
      font_size: 20,
      font_color: '#0000ff',
      background_color: '#ffff00',
      z_index: 10
    };

    const result = await updateTextNote(updateInput);

    expect(result.position.x).toEqual(500);
    expect(result.position.y).toEqual(600);
    expect(result.size.width).toEqual(300);
    expect(result.size.height).toEqual(150);
    expect(result.content).toEqual('Multi-field update');
    expect(result.font_size).toEqual(20);
    expect(result.font_color).toEqual('#0000ff');
    expect(result.background_color).toEqual('#ffff00');
    expect(result.z_index).toEqual(10);
  });

  it('should update database records correctly', async () => {
    const noteId = await createTestTextNote();

    await updateTextNote({
      id: noteId,
      position: { x: 350, y: 450 },
      content: 'Database verification'
    });

    // Verify canvas_elements table was updated
    const canvasElement = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, noteId))
      .execute();

    expect(canvasElement).toHaveLength(1);
    expect(parseFloat(canvasElement[0].position_x)).toEqual(350);
    expect(parseFloat(canvasElement[0].position_y)).toEqual(450);
    expect(canvasElement[0].updated_at).toBeInstanceOf(Date);

    // Verify text_notes table was updated
    const textNote = await db.select()
      .from(textNotesTable)
      .where(eq(textNotesTable.id, noteId))
      .execute();

    expect(textNote).toHaveLength(1);
    expect(textNote[0].content).toEqual('Database verification');
  });

  it('should update updated_at timestamp', async () => {
    const noteId = await createTestTextNote();

    // Get original timestamp
    const originalNote = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, noteId))
      .execute();

    const originalTimestamp = originalNote[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = await updateTextNote({
      id: noteId,
      content: 'Timestamp test'
    });

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should preserve created_at timestamp', async () => {
    const noteId = await createTestTextNote();

    // Get original timestamps
    const originalNote = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, noteId))
      .execute();

    const originalCreatedAt = originalNote[0].created_at;

    const result = await updateTextNote({
      id: noteId,
      content: 'Created timestamp test'
    });

    expect(result.created_at).toEqual(originalCreatedAt);
  });

  it('should handle numeric conversions correctly', async () => {
    const noteId = await createTestTextNote();

    const result = await updateTextNote({
      id: noteId,
      position: { x: 123.456, y: 789.012 },
      size: { width: 234.567, height: 345.678 },
      font_size: 16.5
    });

    expect(typeof result.position.x).toBe('number');
    expect(typeof result.position.y).toBe('number');
    expect(typeof result.size.width).toBe('number');
    expect(typeof result.size.height).toBe('number');
    expect(typeof result.font_size).toBe('number');

    expect(result.position.x).toEqual(123.456);
    expect(result.position.y).toEqual(789.012);
    expect(result.size.width).toEqual(234.567);
    expect(result.size.height).toEqual(345.678);
    expect(result.font_size).toEqual(16.5);
  });

  it('should throw error for non-existent text note', async () => {
    const nonExistentId = '12345678-1234-1234-1234-123456789abc';

    await expect(updateTextNote({
      id: nonExistentId,
      content: 'Should fail'
    })).rejects.toThrow(/not found/i);
  });

  it('should handle empty update (no fields to update)', async () => {
    const noteId = await createTestTextNote();

    // Update with just ID - no actual changes
    const result = await updateTextNote({
      id: noteId
    });

    // Should return the unchanged note
    expect(result.id).toEqual(noteId);
    expect(result.content).toEqual('Original content');
    expect(result.position.x).toEqual(100);
    expect(result.font_size).toEqual(14);
  });
});