import { db } from '../db';
import { canvasElementsTable, textNotesTable, drawingsTable } from '../db/schema';
import { type CanvasViewport, type CanvasElementsResponse, type AnyCanvasElement } from '../schema';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

export async function getCanvasElements(viewport?: CanvasViewport): Promise<CanvasElementsResponse> {
  try {
    // Build base query with joins
    const baseQuery = db.select({
      // Canvas element base fields
      id: canvasElementsTable.id,
      type: canvasElementsTable.type,
      position_x: canvasElementsTable.position_x,
      position_y: canvasElementsTable.position_y,
      width: canvasElementsTable.width,
      height: canvasElementsTable.height,
      z_index: canvasElementsTable.z_index,
      created_at: canvasElementsTable.created_at,
      updated_at: canvasElementsTable.updated_at,
      // Text note fields (will be null for drawings)
      content: textNotesTable.content,
      font_size: textNotesTable.font_size,
      font_color: textNotesTable.font_color,
      background_color: textNotesTable.background_color,
      // Drawing fields (will be null for text notes)
      strokes: drawingsTable.strokes,
    })
    .from(canvasElementsTable)
    .leftJoin(textNotesTable, eq(canvasElementsTable.id, textNotesTable.id))
    .leftJoin(drawingsTable, eq(canvasElementsTable.id, drawingsTable.id))
    .orderBy(asc(canvasElementsTable.z_index));

    let results;

    // Apply viewport filtering if provided
    if (viewport) {
      // Check if element overlaps with viewport
      // Element is visible if it overlaps with the viewport rectangle
      const viewportRight = viewport.x + viewport.width;
      const viewportBottom = viewport.y + viewport.height;

      // Element overlaps if:
      // - Element's left edge is less than viewport's right edge
      // - Element's right edge is greater than viewport's left edge  
      // - Element's top edge is less than viewport's bottom edge
      // - Element's bottom edge is greater than viewport's top edge
      results = await baseQuery.where(
        and(
          lte(canvasElementsTable.position_x, viewportRight.toString()),
          gte(canvasElementsTable.position_x, viewport.x.toString()),
          lte(canvasElementsTable.position_y, viewportBottom.toString()),
          gte(canvasElementsTable.position_y, viewport.y.toString())
        )
      ).execute();
    } else {
      results = await baseQuery.execute();
    }

    // Transform results into proper schema format
    const elements: AnyCanvasElement[] = results.map(result => {
      const baseElement = {
        id: result.id,
        position: {
          x: parseFloat(result.position_x),
          y: parseFloat(result.position_y),
        },
        size: {
          width: parseFloat(result.width),
          height: parseFloat(result.height),
        },
        z_index: result.z_index,
        created_at: result.created_at,
        updated_at: result.updated_at,
      };

      if (result.type === 'text_note') {
        return {
          ...baseElement,
          type: 'text_note' as const,
          content: result.content!,
          font_size: parseFloat(result.font_size!),
          font_color: result.font_color!,
          background_color: result.background_color!,
        };
      } else {
        return {
          ...baseElement,
          type: 'drawing' as const,
          strokes: result.strokes as any,
        };
      }
    });

    return {
      elements,
      total_count: elements.length,
    };
  } catch (error) {
    console.error('Failed to get canvas elements:', error);
    throw error;
  }
}