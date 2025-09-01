import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type AnyCanvasElement, type TextNote, type Drawing } from '../schema';
import { z } from 'zod';
import { eq, inArray, SQL } from 'drizzle-orm';

// Schema for bulk position/z-index updates
export const bulkUpdateInputSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    z_index: z.number().int().optional(),
  })),
});

export type BulkUpdateInput = z.infer<typeof bulkUpdateInputSchema>;

export async function bulkUpdateElements(input: BulkUpdateInput): Promise<AnyCanvasElement[]> {
  try {
    if (input.updates.length === 0) {
      return [];
    }

    // Extract IDs for querying
    const elementIds = input.updates.map(update => update.id);

    // Perform bulk updates within a transaction
    await db.transaction(async (tx) => {
      // Update each element individually since we need different values per element
      for (const update of input.updates) {
        const updateData: any = {
          updated_at: new Date(),
        };

        // Add position updates if provided
        if (update.position) {
          updateData.position_x = update.position.x.toString();
          updateData.position_y = update.position.y.toString();
        }

        // Add z-index update if provided
        if (update.z_index !== undefined) {
          updateData.z_index = update.z_index;
        }

        // Only update if there are actual changes (beyond updated_at)
        if (Object.keys(updateData).length > 1) {
          await tx.update(canvasElementsTable)
            .set(updateData)
            .where(eq(canvasElementsTable.id, update.id))
            .execute();
        }
      }
    });

    // Retrieve all updated elements with their complete data
    const canvasElements = await db.select()
      .from(canvasElementsTable)
      .where(inArray(canvasElementsTable.id, elementIds))
      .execute();

    // Get text notes data for text_note elements
    const textNoteIds = canvasElements
      .filter(el => el.type === 'text_note')
      .map(el => el.id);
    
    const textNotes = textNoteIds.length > 0 
      ? await db.select()
          .from(textNotesTable)
          .where(inArray(textNotesTable.id, textNoteIds))
          .execute()
      : [];

    // Get drawings data for drawing elements
    const drawingIds = canvasElements
      .filter(el => el.type === 'drawing')
      .map(el => el.id);
    
    const drawings = drawingIds.length > 0
      ? await db.select()
          .from(drawingsTable)
          .where(inArray(drawingsTable.id, drawingIds))
          .execute()
      : [];

    // Create lookup maps for efficient data joining
    const textNotesMap = new Map(textNotes.map(tn => [tn.id, tn]));
    const drawingsMap = new Map(drawings.map(d => [d.id, d]));

    // Combine data and convert numeric fields
    const results: AnyCanvasElement[] = canvasElements.map(element => {
      const baseElement = {
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
      };

      if (element.type === 'text_note') {
        const textNote = textNotesMap.get(element.id);
        if (!textNote) {
          throw new Error(`Text note data not found for element ${element.id}`);
        }

        return {
          ...baseElement,
          type: 'text_note' as const,
          content: textNote.content,
          font_size: parseFloat(textNote.font_size),
          font_color: textNote.font_color,
          background_color: textNote.background_color,
        };
      } else if (element.type === 'drawing') {
        const drawing = drawingsMap.get(element.id);
        if (!drawing) {
          throw new Error(`Drawing data not found for element ${element.id}`);
        }

        return {
          ...baseElement,
          type: 'drawing' as const,
          strokes: drawing.strokes as any, // JSONB data
        };
      }

      throw new Error(`Unknown element type: ${element.type}`);
    });

    return results;
  } catch (error) {
    console.error('Bulk update elements failed:', error);
    throw error;
  }
}