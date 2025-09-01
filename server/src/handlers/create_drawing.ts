import { db } from '../db';
import { canvasElementsTable, drawingsTable } from '../db/schema';
import { type CreateDrawingInput, type Drawing } from '../schema';

export async function createDrawing(input: CreateDrawingInput): Promise<Drawing> {
  try {
    // Insert into canvas_elements table first
    const canvasElementResult = await db.insert(canvasElementsTable)
      .values({
        type: 'drawing',
        position_x: input.position.x.toString(),
        position_y: input.position.y.toString(),
        width: input.size.width.toString(),
        height: input.size.height.toString(),
        z_index: input.z_index,
        data: {} // Empty object for now, drawing-specific data goes in drawings table
      })
      .returning()
      .execute();

    const canvasElement = canvasElementResult[0];

    // Insert into drawings table with the same ID
    await db.insert(drawingsTable)
      .values({
        id: canvasElement.id,
        strokes: input.strokes
      })
      .execute();

    // Return the complete drawing object
    return {
      id: canvasElement.id,
      type: 'drawing' as const,
      position: {
        x: parseFloat(canvasElement.position_x),
        y: parseFloat(canvasElement.position_y)
      },
      size: {
        width: parseFloat(canvasElement.width),
        height: parseFloat(canvasElement.height)
      },
      z_index: canvasElement.z_index,
      strokes: input.strokes,
      created_at: canvasElement.created_at,
      updated_at: canvasElement.updated_at
    };
  } catch (error) {
    console.error('Drawing creation failed:', error);
    throw error;
  }
}