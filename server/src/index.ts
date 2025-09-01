import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createTextNoteInputSchema,
  createDrawingInputSchema,
  updateTextNoteInputSchema,
  updateDrawingInputSchema,
  canvasViewportSchema,
} from './schema';

// Import handlers
import { createTextNote } from './handlers/create_text_note';
import { createDrawing } from './handlers/create_drawing';
import { updateTextNote } from './handlers/update_text_note';
import { updateDrawing } from './handlers/update_drawing';
import { getCanvasElements } from './handlers/get_canvas_elements';
import { getCanvasElement } from './handlers/get_canvas_element';
import { deleteCanvasElement } from './handlers/delete_canvas_element';
import { bulkUpdateElements, bulkUpdateInputSchema } from './handlers/bulk_update_elements';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Text note operations
  createTextNote: publicProcedure
    .input(createTextNoteInputSchema)
    .mutation(({ input }) => createTextNote(input)),

  updateTextNote: publicProcedure
    .input(updateTextNoteInputSchema)
    .mutation(({ input }) => updateTextNote(input)),

  // Drawing operations
  createDrawing: publicProcedure
    .input(createDrawingInputSchema)
    .mutation(({ input }) => createDrawing(input)),

  updateDrawing: publicProcedure
    .input(updateDrawingInputSchema)
    .mutation(({ input }) => updateDrawing(input)),

  // General canvas element operations
  getCanvasElements: publicProcedure
    .input(canvasViewportSchema.optional())
    .query(({ input }) => getCanvasElements(input)),

  getCanvasElement: publicProcedure
    .input(z.string())
    .query(({ input }) => getCanvasElement(input)),

  deleteCanvasElement: publicProcedure
    .input(z.string())
    .mutation(({ input }) => deleteCanvasElement(input)),

  // Bulk operations for performance
  bulkUpdateElements: publicProcedure
    .input(bulkUpdateInputSchema)
    .mutation(({ input }) => bulkUpdateElements(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();