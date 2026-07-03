# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ARG VERSION
ARG REVISION
ARG CREATED
ARG DESCRIPTION
ARG SOURCE

LABEL org.opencontainers.image.title="CinePro Core" \
      org.opencontainers.image.description="${DESCRIPTION}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      org.opencontainers.image.source="${SOURCE}"

LABEL org.opencontainers.image.description="CinePro Core is the central scraping and streaming engine of the CinePro ecosystem. It exposes an OMSS-compliant HTTP API for resolving movie and TV show streams from multiple providers."

ARG NODE_ENV=production
ARG PORT=3000
ARG CACHE_TYPE=memory

ENV NODE_ENV=${NODE_ENV}
ENV HOST=0.0.0.0
ENV PORT=${PORT}
ENV CACHE_TYPE=${CACHE_TYPE}

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE ${PORT}

CMD ["node", "dist/server.js"]