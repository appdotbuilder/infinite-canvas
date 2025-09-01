import { db } from '../db';
import { canvasElementsTable, drawingsTable } from '../db/schema';
import { type UpdateDrawingInput, type Drawing } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateDrawing(input: UpdateDrawingInput): Promise<Drawing> {
  try {
    // Start a transaction to ensure consistency between tables
    return await db.transaction(async (tx) => {
      // First, check if the drawing exists
      const existingElements = await tx
        .select()
        .from(canvasElementsTable)
        .innerJoin(drawingsTable, eq(canvasElementsTable.id, drawingsTable.id))
        .where(
          and(
            eq(canvasElementsTable.id, input.id),
            eq(canvasElementsTable.type, 'drawing')
          )
        )
        .execute();

      if (existingElements.length === 0) {
        throw new Error(`Drawing with ID ${input.id} not found`);
      }

      const existing = existingElements[0];

      // Update canvas_elements table if position, size, or z_index are provided
      const canvasUpdates: Partial<{
        position_x: string;
        position_y: string;
        width: string;
        height: string;
        z_index: number;
        updated_at: Date;
      }> = {
        updated_at: new Date(),
      };

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

      // Update canvas_elements table
      await tx
        .update(canvasElementsTable)
        .set(canvasUpdates)
        .where(eq(canvasElementsTable.id, input.id))
        .execute();

      // Update drawings table if strokes are provided
      if (input.strokes !== undefined) {
        await tx
          .update(drawingsTable)
          .set({
            strokes: input.strokes,
          })
          .where(eq(drawingsTable.id, input.id))
          .execute();
      }

      // Fetch the updated drawing with all current values
      const updatedElements = await tx
        .select()
        .from(canvasElementsTable)
        .innerJoin(drawingsTable, eq(canvasElementsTable.id, drawingsTable.id))
        .where(eq(canvasElementsTable.id, input.id))
        .execute();

      const updated = updatedElements[0];

      // Convert numeric fields and return as Drawing type
      return {
        id: updated.canvas_elements.id,
        type: 'drawing' as const,
        position: {
          x: parseFloat(updated.canvas_elements.position_x),
          y: parseFloat(updated.canvas_elements.position_y),
        },
        size: {
          width: parseFloat(updated.canvas_elements.width),
          height: parseFloat(updated.canvas_elements.height),
        },
        z_index: updated.canvas_elements.z_index,
        strokes: updated.drawings.strokes as any[], // JSONB field
        created_at: updated.canvas_elements.created_at,
        updated_at: updated.canvas_elements.updated_at,
      };
    });
  } catch (error) {
    console.error('Drawing update failed:', error);
    throw error;
  }
}