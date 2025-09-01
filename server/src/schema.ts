import { z } from 'zod';

// Canvas element types enum
export const canvasElementTypeSchema = z.enum(['text_note', 'drawing']);
export type CanvasElementType = z.infer<typeof canvasElementTypeSchema>;

// Base position and size schema
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const sizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

// Drawing stroke schema for freehand drawing
export const strokePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().min(0).max(1).optional(),
});

export const strokeSchema = z.object({
  points: z.array(strokePointSchema),
  color: z.string().default('#000000'),
  width: z.number().positive().default(2),
});

// Canvas element base schema
export const canvasElementSchema = z.object({
  id: z.string(),
  type: canvasElementTypeSchema,
  position: positionSchema,
  size: sizeSchema,
  z_index: z.number().int().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type CanvasElement = z.infer<typeof canvasElementSchema>;

// Text note specific schema
export const textNoteSchema = canvasElementSchema.extend({
  type: z.literal('text_note'),
  content: z.string(),
  font_size: z.number().positive().default(16),
  font_color: z.string().default('#000000'),
  background_color: z.string().default('#ffff88'),
});

export type TextNote = z.infer<typeof textNoteSchema>;

// Drawing specific schema
export const drawingSchema = canvasElementSchema.extend({
  type: z.literal('drawing'),
  strokes: z.array(strokeSchema),
});

export type Drawing = z.infer<typeof drawingSchema>;

// Union type for all canvas elements
export const anyCanvasElementSchema = z.discriminatedUnion('type', [
  textNoteSchema,
  drawingSchema,
]);

export type AnyCanvasElement = z.infer<typeof anyCanvasElementSchema>;

// Input schemas for creating elements
export const createTextNoteInputSchema = z.object({
  position: positionSchema,
  size: sizeSchema,
  content: z.string(),
  font_size: z.number().positive().default(16),
  font_color: z.string().default('#000000'),
  background_color: z.string().default('#ffff88'),
  z_index: z.number().int().default(0),
});

export type CreateTextNoteInput = z.infer<typeof createTextNoteInputSchema>;

export const createDrawingInputSchema = z.object({
  position: positionSchema,
  size: sizeSchema,
  strokes: z.array(strokeSchema),
  z_index: z.number().int().default(0),
});

export type CreateDrawingInput = z.infer<typeof createDrawingInputSchema>;

// Input schemas for updating elements
export const updateTextNoteInputSchema = z.object({
  id: z.string(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  content: z.string().optional(),
  font_size: z.number().positive().optional(),
  font_color: z.string().optional(),
  background_color: z.string().optional(),
  z_index: z.number().int().optional(),
});

export type UpdateTextNoteInput = z.infer<typeof updateTextNoteInputSchema>;

export const updateDrawingInputSchema = z.object({
  id: z.string(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  strokes: z.array(strokeSchema).optional(),
  z_index: z.number().int().optional(),
});

export type UpdateDrawingInput = z.infer<typeof updateDrawingInputSchema>;

// Canvas viewport schema for loading elements within visible area
export const canvasViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  zoom: z.number().positive().default(1),
});

export type CanvasViewport = z.infer<typeof canvasViewportSchema>;

// Response schema for canvas elements with pagination
export const canvasElementsResponseSchema = z.object({
  elements: z.array(anyCanvasElementSchema),
  total_count: z.number().int().nonnegative(),
});

export type CanvasElementsResponse = z.infer<typeof canvasElementsResponseSchema>;