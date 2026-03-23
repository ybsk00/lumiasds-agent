FROM node:20-slim AS base

WORKDIR /app

# 루트 package.json + lock
COPY package.json package-lock.json* ./
COPY turbo.json ./

# 워크스페이스 패키지
COPY packages/shared/package.json ./packages/shared/
COPY apps/orchestrator/package.json ./apps/orchestrator/

RUN npm install --production=false

# 소스 복사
COPY packages/shared/ ./packages/shared/
COPY apps/orchestrator/ ./apps/orchestrator/

# 빌드
RUN npm run build --workspace=@lumiads/shared
RUN npm run build --workspace=@lumiads/orchestrator

# 프로덕션
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/orchestrator/dist ./apps/orchestrator/dist
COPY --from=base /app/apps/orchestrator/package.json ./apps/orchestrator/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "apps/orchestrator/dist/index.js"]
