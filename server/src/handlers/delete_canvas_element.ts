import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type AnyCanvasElement } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteCanvasElement = async (id: string): Promise<AnyCanvasElement> => {
  try {
    // First, find the element to return before deletion
    const elementResult = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, id))
      .execute();

    if (elementResult.length === 0) {
      throw new Error(`Canvas element with id ${id} not found`);
    }

    const element = elementResult[0];

    // Get type-specific data based on element type
    let specificData: any = {};
    if (element.type === 'text_note') {
      const textNoteResult = await db.select()
        .from(textNotesTable)
        .where(eq(textNotesTable.id, id))
        .execute();
      
      if (textNoteResult.length > 0) {
        const textNote = textNoteResult[0];
        specificData = {
          content: textNote.content,
          font_size: parseFloat(textNote.font_size),
          font_color: textNote.font_color,
          background_color: textNote.background_color,
        };
      }
    } else if (element.type === 'drawing') {
      const drawingResult = await db.select()
        .from(drawingsTable)
        .where(eq(drawingsTable.id, id))
        .execute();
      
      if (drawingResult.length > 0) {
        const drawing = drawingResult[0];
        specificData = {
          strokes: drawing.strokes,
        };
      }
    }

    // Delete the element (cascade will handle related tables)
    await db.delete(canvasElementsTable)
      .where(eq(canvasElementsTable.id, id))
      .execute();

    // Return the deleted element with proper type conversions
    const deletedElement: AnyCanvasElement = {
      id: element.id,
      type: element.type,
      position: {
        x: parseFloat(element.position_x),
        y: parseFloat(element.position_y),
      },
      size: {
        width: parseFloat(element.width),
        height: parseFloat(element.height),
      },
      z_index: element.z_index,
      created_at: element.created_at,
      updated_at: element.updated_at,
      ...specificData,
    };

    return deletedElement;
  } catch (error) {
    console.error('Canvas element deletion failed:', error);
    throw error;
  }
};