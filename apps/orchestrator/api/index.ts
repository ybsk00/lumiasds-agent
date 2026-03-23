import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok', service: 'lumiads-orchestrator' }));

// Lazy import the full app to catch any module-level errors
app.all('/api/*', async (c) => {
  try {
    const { app: fullApp } = await import('../src/app');
    return fullApp.fetch(c.req.raw);
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) }, 500);
  }
});

app.all('/admin/*', async (c) => {
  try {
    const { app: fullApp } = await import('../src/app');
    return fullApp.fetch(c.req.raw);
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) }, 500);
  }
});

app.all('/scheduler/*', async (c) => {
  try {
    const { app: fullApp } = await import('../src/app');
    return fullApp.fetch(c.req.raw);
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) }, 500);
  }
});

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default handle(app);
