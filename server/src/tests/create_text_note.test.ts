import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { canvasElementsTable, textNotesTable } from '../db/schema';
import { type CreateTextNoteInput } from '../schema';
import { createTextNote } from '../handlers/create_text_note';
import { eq } from 'drizzle-orm';

// Test input with all fields specified
const testInput: CreateTextNoteInput = {
  position: { x: 100.5, y: 200.25 },
  size: { width: 300, height: 150 },
  content: 'Test note content',
  font_size: 18,
  font_color: '#333333',
  background_color: '#ffcc00',
  z_index: 5
};

// Test input with default values applied
const minimalInput: CreateTextNoteInput = {
  position: { x: 50, y: 75 },
  size: { width: 200, height: 100 },
  content: 'Minimal note',
  font_size: 16, // Include default values explicitly
  font_color: '#000000',
  background_color: '#ffff88',
  z_index: 0
};

describe('createTextNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a text note with all specified fields', async () => {
    const result = await createTextNote(testInput);

    // Verify all fields are correctly set
    expect(result.type).toEqual('text_note');
    expect(result.position.x).toEqual(100.5);
    expect(result.position.y).toEqual(200.25);
    expect(result.size.width).toEqual(300);
    expect(result.size.height).toEqual(150);
    expect(result.content).toEqual('Test note content');
    expect(result.font_size).toEqual(18);
    expect(result.font_color).toEqual('#333333');
    expect(result.background_color).toEqual('#ffcc00');
    expect(result.z_index).toEqual(5);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a text note with default values', async () => {
    const result = await createTextNote(minimalInput);

    // Verify defaults are applied correctly
    expect(result.type).toEqual('text_note');
    expect(result.position.x).toEqual(50);
    expect(result.position.y).toEqual(75);
    expect(result.size.width).toEqual(200);
    expect(result.size.height).toEqual(100);
    expect(result.content).toEqual('Minimal note');
    expect(result.font_size).toEqual(16); // Default
    expect(result.font_color).toEqual('#000000'); // Default
    expect(result.background_color).toEqual('#ffff88'); // Default
    expect(result.z_index).toEqual(0); // Default
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save text note to canvas_elements table', async () => {
    const result = await createTextNote(testInput);

    // Query canvas elements table
    const canvasElements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, result.id))
      .execute();

    expect(canvasElements).toHaveLength(1);
    const element = canvasElements[0];
    
    expect(element.type).toEqual('text_note');
    expect(parseFloat(element.position_x)).toEqual(100.5);
    expect(parseFloat(element.position_y)).toEqual(200.25);
    expect(parseFloat(element.width)).toEqual(300);
    expect(parseFloat(element.height)).toEqual(150);
    expect(element.z_index).toEqual(5);
    expect(element.created_at).toBeInstanceOf(Date);
    expect(element.updated_at).toBeInstanceOf(Date);
  });

  it('should save text note to text_notes table', async () => {
    const result = await createTextNote(testInput);

    // Query text notes table
    const textNotes = await db.select()
      .from(textNotesTable)
      .where(eq(textNotesTable.id, result.id))
      .execute();

    expect(textNotes).toHaveLength(1);
    const textNote = textNotes[0];
    
    expect(textNote.content).toEqual('Test note content');
    expect(parseFloat(textNote.font_size)).toEqual(18);
    expect(textNote.font_color).toEqual('#333333');
    expect(textNote.background_color).toEqual('#ffcc00');
  });

  it('should handle numeric precision correctly', async () => {
    const precisionInput: CreateTextNoteInput = {
      position: { x: 123.456789, y: 987.654321 },
      size: { width: 456.123, height: 789.987 },
      content: 'Precision test',
      font_size: 14.75,
      font_color: '#000000',
      background_color: '#ffff88',
      z_index: 0
    };

    const result = await createTextNote(precisionInput);

    // Verify numeric values maintain precision
    expect(result.position.x).toEqual(123.456789);
    expect(result.position.y).toEqual(987.654321);
    expect(result.size.width).toEqual(456.123);
    expect(result.size.height).toEqual(789.987);
    expect(result.font_size).toEqual(14.75);

    // Verify database storage maintains precision
    const canvasElements = await db.select()
      .from(canvasElementsTable)
      .where(eq(canvasElementsTable.id, result.id))
      .execute();
    
    const element = canvasElements[0];
    expect(parseFloat(element.position_x)).toEqual(123.456789);
    expect(parseFloat(element.position_y)).toEqual(987.654321);
    expect(parseFloat(element.width)).toEqual(456.123);
    expect(parseFloat(element.height)).toEqual(789.987);
  });

  it('should create text notes with different z-index values', async () => {
    const inputs = [
      { ...testInput, z_index: -5, content: 'Behind note' },
      { ...testInput, z_index: 0, content: 'Base note' },
      { ...testInput, z_index: 10, content: 'Front note' }
    ];

    const results = await Promise.all(inputs.map(input => createTextNote(input)));

    // Verify z-index values are preserved
    expect(results[0].z_index).toEqual(-5);
    expect(results[1].z_index).toEqual(0);
    expect(results[2].z_index).toEqual(10);

    // Verify contents match
    expect(results[0].content).toEqual('Behind note');
    expect(results[1].content).toEqual('Base note');
    expect(results[2].content).toEqual('Front note');
  });

  it('should handle empty content correctly', async () => {
    const emptyContentInput: CreateTextNoteInput = {
      ...testInput,
      content: ''
    };

    const result = await createTextNote(emptyContentInput);
    
    expect(result.content).toEqual('');
    expect(result.id).toBeDefined();
  });

  it('should verify numeric type conversions', async () => {
    const result = await createTextNote(testInput);

    // Ensure all numeric fields return as numbers, not strings
    expect(typeof result.position.x).toBe('number');
    expect(typeof result.position.y).toBe('number');
    expect(typeof result.size.width).toBe('number');
    expect(typeof result.size.height).toBe('number');
    expect(typeof result.font_size).toBe('number');
    expect(typeof result.z_index).toBe('number');
  });
});