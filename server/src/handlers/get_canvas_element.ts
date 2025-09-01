import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type AnyCanvasElement } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCanvasElement(id: string): Promise<AnyCanvasElement> {
  try {
    // First get the canvas element to determine its type
    const canvasElements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, id))
      .execute();

    if (canvasElements.length === 0) {
      throw new Error(`Canvas element with id ${id} not found`);
    }

    const canvasElement = canvasElements[0];

    // Join with the appropriate table based on type
    if (canvasElement.type === 'text_note') {
      const textNoteResults = await db.select()
        .from(canvasElementsTable)
        .innerJoin(textNotesTable, eq(canvasElementsTable.id, textNotesTable.id))
        .where(eq(canvasElementsTable.id, id))
        .execute();

      if (textNoteResults.length === 0) {
        throw new Error(`Text note data not found for element ${id}`);
      }

      const result = textNoteResults[0];
      return {
        id: result.canvas_elements.id,
        type: 'text_note' as const,
        position: {
          x: parseFloat(result.canvas_elements.position_x),
          y: parseFloat(result.canvas_elements.position_y),
        },
        size: {
          width: parseFloat(result.canvas_elements.width),
          height: parseFloat(result.canvas_elements.height),
        },
        z_index: result.canvas_elements.z_index,
        content: result.text_notes.content,
        font_size: parseFloat(result.text_notes.font_size),
        font_color: result.text_notes.font_color,
        background_color: result.text_notes.background_color,
        created_at: result.canvas_elements.created_at,
        updated_at: result.canvas_elements.updated_at,
      };
    } else if (canvasElement.type === 'drawing') {
      const drawingResults = await db.select()
        .from(canvasElementsTable)
        .innerJoin(drawingsTable, eq(canvasElementsTable.id, drawingsTable.id))
        .where(eq(canvasElementsTable.id, id))
        .execute();

      if (drawingResults.length === 0) {
        throw new Error(`Drawing data not found for element ${id}`);
      }

      const result = drawingResults[0];
      return {
        id: result.canvas_elements.id,
        type: 'drawing' as const,
        position: {
          x: parseFloat(result.canvas_elements.position_x),
          y: parseFloat(result.canvas_elements.position_y),
        },
        size: {
          width: parseFloat(result.canvas_elements.width),
          height: parseFloat(result.canvas_elements.height),
        },
        z_index: result.canvas_elements.z_index,
        strokes: result.drawings.strokes as any, // JSONB data
        created_at: result.canvas_elements.created_at,
        updated_at: result.canvas_elements.updated_at,
      };
    } else {
      throw new Error(`Unknown canvas element type: ${canvasElement.type}`);
    }
  } catch (error) {
    console.error('Get canvas element failed:', error);
    throw error;
  }
}