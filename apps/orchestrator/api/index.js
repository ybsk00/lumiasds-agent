let appHandler = null;

async function getHandler() {
  if (!appHandler) {
    const { handle } = await import('hono/vercel');
    const { app } = await import('../src/app.ts');
    appHandler = handle(app);
  }
  return appHandler;
}

export default async function handler(req, res) {
  try {
    const h = await getHandler();
    return h(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) });
  }
}

export const config = {
  maxDuration: 60,
};
