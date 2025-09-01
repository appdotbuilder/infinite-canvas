import { db } from '../db';
import { canvasElementsTable, textNotesTable } from '../db/schema';
import { type UpdateTextNoteInput, type TextNote } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateTextNote(input: UpdateTextNoteInput): Promise<TextNote> {
  try {
    // First, verify the text note exists by joining both tables
    const existingNote = await db.select()
      .from(canvasElementsTable)
      .innerJoin(textNotesTable, eq(canvasElementsTable.id, textNotesTable.id))
      .where(
        and(
          eq(canvasElementsTable.id, input.id),
          eq(canvasElementsTable.type, 'text_note')
        )
      )
      .execute();

    if (existingNote.length === 0) {
      throw new Error(`Text note with ID ${input.id} not found`);
    }

    // Always update the timestamp in canvas_elements
    const canvasUpdates: any = {
      updated_at: new Date()
    };

    // Add canvas-specific updates if provided
    if (input.position) {
      canvasUpdates.position_x = input.position.x.toString();
      canvasUpdates.position_y = input.position.y.toString();
    }

    if (input.size) {
      canvasUpdates.width = input.size.width.toString();
      canvasUpdates.height = input.size.height.toString();
    }

    if (input.z_index !== undefined) {
      canvasUpdates.z_index = input.z_index;
    }

    await db.update(canvasElementsTable)
      .set(canvasUpdates)
      .where(eq(canvasElementsTable.id, input.id))
      .execute();

    // Update text_notes table if text-specific fields provided
    if (input.content !== undefined || input.font_size !== undefined || 
        input.font_color !== undefined || input.background_color !== undefined) {
      const textUpdates: any = {};

      if (input.content !== undefined) {
        textUpdates.content = input.content;
      }

      if (input.font_size !== undefined) {
        textUpdates.font_size = input.font_size.toString();
      }

      if (input.font_color !== undefined) {
        textUpdates.font_color = input.font_color;
      }

      if (input.background_color !== undefined) {
        textUpdates.background_color = input.background_color;
      }

      await db.update(textNotesTable)
        .set(textUpdates)
        .where(eq(textNotesTable.id, input.id))
        .execute();
    }

    // Fetch and return the updated text note
    const updatedNote = await db.select()
      .from(canvasElementsTable)
      .innerJoin(textNotesTable, eq(canvasElementsTable.id, textNotesTable.id))
      .where(eq(canvasElementsTable.id, input.id))
      .execute();

    const canvasData = updatedNote[0].canvas_elements;
    const textData = updatedNote[0].text_notes;

    return {
      id: canvasData.id,
      type: 'text_note' as const,
      position: {
        x: parseFloat(canvasData.position_x),
        y: parseFloat(canvasData.position_y)
      },
      size: {
        width: parseFloat(canvasData.width),
        height: parseFloat(canvasData.height)
      },
      z_index: canvasData.z_index,
      content: textData.content,
      font_size: parseFloat(textData.font_size),
      font_color: textData.font_color,
      background_color: textData.background_color,
      created_at: canvasData.created_at,
      updated_at: canvasData.updated_at,
    };
  } catch (error) {
    console.error('Text note update failed:', error);
    throw error;
  }
}