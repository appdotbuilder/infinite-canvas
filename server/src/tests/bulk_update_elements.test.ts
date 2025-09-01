import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type CreateTextNoteInput, type CreateDrawingInput } from '../schema';
import { bulkUpdateElements, type BulkUpdateInput } from '../handlers/bulk_update_elements';
import { eq } from 'drizzle-orm';

// Helper functions to create test data
async function createTestTextNote(input: CreateTextNoteInput) {
  // Insert into canvas_elements table
  const canvasElementResult = await db.insert(canvasElementsTable)
    .values({
      type: 'text_note',
      position_x: input.position.x.toString(),
      position_y: input.position.y.toString(),
      width: input.size.width.toString(),
      height: input.size.height.toString(),
      z_index: input.z_index,
      data: {}, // Required field but not used for text notes
    })
    .returning()
    .execute();

  const canvasElement = canvasElementResult[0];

  // Insert into text_notes table
  await db.insert(textNotesTable)
    .values({
      id: canvasElement.id,
      content: input.content,
      font_size: input.font_size.toString(),
      font_color: input.font_color,
      background_color: input.background_color,
    })
    .execute();

  return {
    id: canvasElement.id,
    type: 'text_note' as const,
    position: {
      x: parseFloat(canvasElement.position_x),
      y: parseFloat(canvasElement.position_y),
    },
    size: {
      width: parseFloat(canvasElement.width),
      height: parseFloat(canvasElement.height),
    },
    z_index: canvasElement.z_index,
    created_at: canvasElement.created_at,
    updated_at: canvasElement.updated_at,
    content: input.content,
    font_size: input.font_size,
    font_color: input.font_color,
    background_color: input.background_color,
  };
}

async function createTestDrawing(input: CreateDrawingInput) {
  // Insert into canvas_elements table
  const canvasElementResult = await db.insert(canvasElementsTable)
    .values({
      type: 'drawing',
      position_x: input.position.x.toString(),
      position_y: input.position.y.toString(),
      width: input.size.width.toString(),
      height: input.size.height.toString(),
      z_index: input.z_index,
      data: {}, // Required field but not used for drawings
    })
    .returning()
    .execute();

  const canvasElement = canvasElementResult[0];

  // Insert into drawings table
  await db.insert(drawingsTable)
    .values({
      id: canvasElement.id,
      strokes: input.strokes,
    })
    .execute();

  return {
    id: canvasElement.id,
    type: 'drawing' as const,
    position: {
      x: parseFloat(canvasElement.position_x),
      y: parseFloat(canvasElement.position_y),
    },
    size: {
      width: parseFloat(canvasElement.width),
      height: parseFloat(canvasElement.height),
    },
    z_index: canvasElement.z_index,
    created_at: canvasElement.created_at,
    updated_at: canvasElement.updated_at,
    strokes: input.strokes,
  };
}

describe('bulkUpdateElements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for empty updates', async () => {
    const input: BulkUpdateInput = {
      updates: []
    };

    const result = await bulkUpdateElements(input);
    expect(result).toEqual([]);
  });

  it('should update positions of multiple text notes', async () => {
    // Create test text notes
    const textNote1 = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Test note 1',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const textNote2 = await createTestTextNote({
      position: { x: 50, y: 60 },
      size: { width: 150, height: 75 },
      content: 'Test note 2',
      font_size: 18,
      font_color: '#333333',
      background_color: '#ffaaaa',
      z_index: 1,
    });

    // Update positions
    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote1.id,
          position: { x: 100, y: 150 },
        },
        {
          id: textNote2.id,
          position: { x: 200, y: 250 },
        }
      ]
    };

    const results = await bulkUpdateElements(input);

    expect(results).toHaveLength(2);
    
    const updatedNote1 = results.find(r => r.id === textNote1.id);
    const updatedNote2 = results.find(r => r.id === textNote2.id);

    expect(updatedNote1).toBeDefined();
    expect(updatedNote1!.position).toEqual({ x: 100, y: 150 });
    expect(updatedNote1!.type).toBe('text_note');
    expect((updatedNote1 as any).content).toBe('Test note 1');

    expect(updatedNote2).toBeDefined();
    expect(updatedNote2!.position).toEqual({ x: 200, y: 250 });
    expect(updatedNote2!.type).toBe('text_note');
    expect((updatedNote2 as any).content).toBe('Test note 2');
  });

  it('should update z-index of multiple elements', async () => {
    // Create test elements
    const textNote = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Test note',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const drawing = await createTestDrawing({
      position: { x: 50, y: 60 },
      size: { width: 200, height: 100 },
      strokes: [
        {
          points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
          color: '#000000',
          width: 2,
        }
      ],
      z_index: 1,
    });

    // Update z-indexes
    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote.id,
          z_index: 5,
        },
        {
          id: drawing.id,
          z_index: 3,
        }
      ]
    };

    const results = await bulkUpdateElements(input);

    expect(results).toHaveLength(2);
    
    const updatedNote = results.find(r => r.id === textNote.id);
    const updatedDrawing = results.find(r => r.id === drawing.id);

    expect(updatedNote!.z_index).toBe(5);
    expect(updatedDrawing!.z_index).toBe(3);
  });

  it('should update both position and z-index simultaneously', async () => {
    const textNote = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Test note',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote.id,
          position: { x: 300, y: 400 },
          z_index: 10,
        }
      ]
    };

    const results = await bulkUpdateElements(input);

    expect(results).toHaveLength(1);
    expect(results[0].position).toEqual({ x: 300, y: 400 });
    expect(results[0].z_index).toBe(10);
    expect(results[0].type).toBe('text_note');
  });

  it('should update database records correctly', async () => {
    const textNote = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Test note',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote.id,
          position: { x: 500, y: 600 },
          z_index: 15,
        }
      ]
    };

    await bulkUpdateElements(input);

    // Verify database was updated
    const dbElement = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, textNote.id))
      .execute();

    expect(dbElement).toHaveLength(1);
    expect(parseFloat(dbElement[0].position_x)).toBe(500);
    expect(parseFloat(dbElement[0].position_y)).toBe(600);
    expect(dbElement[0].z_index).toBe(15);
    expect(dbElement[0].updated_at).toBeInstanceOf(Date);
    expect(dbElement[0].updated_at.getTime()).toBeGreaterThan(textNote.updated_at.getTime());
  });

  it('should handle mixed element types correctly', async () => {
    const textNote = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Mixed test',
      font_size: 14,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const drawing = await createTestDrawing({
      position: { x: 100, y: 200 },
      size: { width: 300, height: 150 },
      strokes: [
        {
          points: [{ x: 5, y: 5 }, { x: 15, y: 15 }, { x: 25, y: 10 }],
          color: '#ff0000',
          width: 3,
        }
      ],
      z_index: 2,
    });

    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote.id,
          position: { x: 111, y: 222 },
        },
        {
          id: drawing.id,
          z_index: 8,
        }
      ]
    };

    const results = await bulkUpdateElements(input);

    expect(results).toHaveLength(2);

    const updatedNote = results.find(r => r.type === 'text_note');
    const updatedDrawing = results.find(r => r.type === 'drawing');

    expect(updatedNote).toBeDefined();
    expect(updatedNote!.position).toEqual({ x: 111, y: 222 });
    expect((updatedNote as any).content).toBe('Mixed test');
    expect((updatedNote as any).font_size).toBe(14);

    expect(updatedDrawing).toBeDefined();
    expect(updatedDrawing!.z_index).toBe(8);
    expect((updatedDrawing as any).strokes).toHaveLength(1);
    expect((updatedDrawing as any).strokes[0].color).toBe('#ff0000');
  });

  it('should handle partial updates (only some elements need changes)', async () => {
    const textNote1 = await createTestTextNote({
      position: { x: 10, y: 20 },
      size: { width: 100, height: 50 },
      content: 'Note 1',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0,
    });

    const textNote2 = await createTestTextNote({
      position: { x: 50, y: 60 },
      size: { width: 100, height: 50 },
      content: 'Note 2',
      font_size: 16,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 1,
    });

    const input: BulkUpdateInput = {
      updates: [
        {
          id: textNote1.id,
          position: { x: 999, y: 888 },
        },
        // textNote2 has no actual changes (no position or z_index provided)
        {
          id: textNote2.id,
        }
      ]
    };

    const results = await bulkUpdateElements(input);

    expect(results).toHaveLength(2);

    const updatedNote1 = results.find(r => r.id === textNote1.id);
    const updatedNote2 = results.find(r => r.id === textNote2.id);

    // Note 1 should be updated
    expect(updatedNote1!.position).toEqual({ x: 999, y: 888 });
    
    // Note 2 should remain unchanged except for updated_at
    expect(updatedNote2!.position).toEqual({ x: 50, y: 60 });
    expect(updatedNote2!.z_index).toBe(1);
  });
});