import { db } from '../db';
import { canvasElementsTable, textNotesTable } from '../db/schema';
import { type CreateTextNoteInput, type TextNote } from '../schema';

export async function createTextNote(input: CreateTextNoteInput): Promise<TextNote> {
  try {
    // Insert the canvas element record first
    const canvasElementResult = await db.insert(canvasElementsTable)
      .values({
        type: 'text_note',
        position_x: input.position.x.toString(),
        position_y: input.position.y.toString(),
        width: input.size.width.toString(),
        height: input.size.height.toString(),
        z_index: input.z_index ?? 0,
        data: {} // Empty object for text notes as specific data is in text_notes table
      })
      .returning()
      .execute();

    const canvasElement = canvasElementResult[0];

    // Insert the text-specific data
    const textNoteResult = await db.insert(textNotesTable)
      .values({
        id: canvasElement.id,
        content: input.content,
        font_size: (input.font_size ?? 16).toString(),
        font_color: input.font_color ?? '#000000',
        background_color: input.background_color ?? '#ffff88'
      })
      .returning()
      .execute();

    const textNote = textNoteResult[0];

    // Return the complete TextNote object with proper type conversions
    return {
      id: canvasElement.id,
      type: 'text_note' as const,
      position: {
        x: parseFloat(canvasElement.position_x),
        y: parseFloat(canvasElement.position_y)
      },
      size: {
        width: parseFloat(canvasElement.width),
        height: parseFloat(canvasElement.height)
      },
      z_index: canvasElement.z_index,
      content: textNote.content,
      font_size: parseFloat(textNote.font_size),
      font_color: textNote.font_color,
      background_color: textNote.background_color,
      created_at: canvasElement.created_at,
      updated_at: canvasElement.updated_at
    };
  } catch (error) {
    console.error('Text note creation failed:', error);
    throw error;
  }
}