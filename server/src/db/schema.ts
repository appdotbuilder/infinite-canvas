import { pgTable, uuid, varchar, text, numeric, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enum for canvas element types
export const canvasElementTypeEnum = pgEnum('canvas_element_type', ['text_note', 'drawing']);

// Main canvas elements table
export const canvasElementsTable = pgTable('canvas_elements', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: canvasElementTypeEnum('type').notNull(),
  
  // Position and size (stored as numeric for precision)
  position_x: numeric('position_x', { precision: 15, scale: 6 }).notNull(),
  position_y: numeric('position_y', { precision: 15, scale: 6 }).notNull(),
  width: numeric('width', { precision: 15, scale: 6 }).notNull(),
  height: numeric('height', { precision: 15, scale: 6 }).notNull(),
  
  // Z-index for layering
  z_index: integer('z_index').notNull().default(0),
  
  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  
  // Type-specific data stored as JSONB for flexibility
  data: jsonb('data').notNull(),
});

// Text notes table - extends canvas elements with text-specific fields
export const textNotesTable = pgTable('text_notes', {
  id: uuid('id').primaryKey().references(() => canvasElementsTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  font_size: numeric('font_size', { precision: 5, scale: 2 }).notNull().default('16'),
  font_color: varchar('font_color', { length: 7 }).notNull().default('#000000'),
  background_color: varchar('background_color', { length: 7 }).notNull().default('#ffff88'),
});

// Drawings table - extends canvas elements with drawing-specific fields
export const drawingsTable = pgTable('drawings', {
  id: uuid('id').primaryKey().references(() => canvasElementsTable.id, { onDelete: 'cascade' }),
  strokes: jsonb('strokes').notNull(), // Array of stroke objects with points, color, width
});

// TypeScript types for the table schemas
export type CanvasElement = typeof canvasElementsTable.$inferSelect;
export type NewCanvasElement = typeof canvasElementsTable.$inferInsert;

export type TextNote = typeof textNotesTable.$inferSelect;
export type NewTextNote = typeof textNotesTable.$inferInsert;

export type Drawing = typeof drawingsTable.$inferSelect;
export type NewDrawing = typeof drawingsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  canvasElements: canvasElementsTable,
  textNotes: textNotesTable,
  drawings: drawingsTable,
};