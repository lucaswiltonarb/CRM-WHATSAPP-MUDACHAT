# NexAtende (CRM-WPP) - PRD

## Problem Statement
Port CRM-WPP from GitHub (Node.js+Vite) to Emergent platform (FastAPI+CRA). Then add Meta WhatsApp Business API Official channel support and PIX payment via WhatsApp.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 - JSON file storage, Evolution API webhooks, Meta Cloud API endpoints, Asaas payments
- **Frontend**: React 19 + TypeScript (CRA with CRACO) on port 3000 - localStorage-based data, custom CSS design system

## What's Been Implemented (Aug 5, 2026)
1. Full app ported from Express+Vite to FastAPI+CRA
2. WhatsApp API Oficial (Meta Cloud) as channel type in Connections
3. Meta Cloud API service (meta-cloud.ts) - send text, CTA URL, PIX payments, order messages
4. Backend endpoints: /api/meta/send-text, /api/meta/send-pix, /api/meta/webhook
5. Chat updated to detect Meta channels and send PIX natively
6. sendWhatsApp.ts supports both Evolution and Meta Cloud API

## Backlog
- P0: End-to-end test with real Meta Cloud API credentials
- P1: WhatsApp native order/catalog payments (requires Commerce Manager setup)
- P1: Meta webhook signature verification (HMAC)
- P2: Template message support for Meta Cloud API
- P2: Media message support (images, documents) via Meta API
