import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';

// 로컬 서버 시작 (Vercel에서는 api/index.ts가 사용됨)
const port = parseInt(process.env.PORT || '8080');
console.log(`LumiAds Orchestrator running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
