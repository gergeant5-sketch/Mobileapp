# Coolify: build from repository root (/) and set port 3000.
FROM node:22-alpine AS builder
WORKDIR /repo
COPY package.json ./
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/server/package.json ./apps/server/package.json
RUN npm install --workspace apps/server --include-workspace-root --no-audit --no-fund
COPY apps/server ./apps/server
RUN npm run build:server

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /repo
COPY --from=builder /repo /repo
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/server"]
