# Sales Pilot Development Instructions

## Project

Sales Pilot is an AI customer support and sales agent for Shopify stores and websites.

The goal is to behave like an AI employee that can:

- answer customer questions
- search products
- recommend products
- check product availability
- track orders
- provide order details
- answer shipping questions
- answer return/refund questions
- hand off customers to humans
- use Shopify data
- use the store knowledge base

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- OpenAI
- Shopify GraphQL
- pnpm

## Development Rules

1. Inspect existing code before changing it.
2. Do not create duplicate systems when an existing system can be extended.
3. Preserve existing functionality.
4. Use TypeScript.
5. Do not expose secrets.
6. Never put SUPABASE_SERVICE_ROLE_KEY in client-side code.
7. Never put Shopify access tokens in client-side code.
8. Never expose OpenAI API keys.
9. Keep server-only logic on the server.
10. Use Supabase migrations for database schema changes.
11. After code changes, run relevant tests, type checks, lint, or build.
12. Fix errors instead of hiding them.
13. Do not make unrelated changes.
14. Before destructive database changes, explain what will be changed.
15. Prefer development/test data instead of production data.
16. Check existing database schema before writing SQL.
17. Check existing functions/RPCs before replacing them.
18. Keep Shopify API logic server-side.
19. Keep action detection and action execution strongly typed.
20. When debugging, find the root cause rather than adding hacks.
21. Never delete or revert existing user changes without permission.
22. Never run git reset --hard without explicit permission.
23. Never run git clean -fd without explicit permission.
24. Do not commit or push unless explicitly requested.

## Verification

After implementation:

- run TypeScript checks
- run lint
- run relevant tests
- run production build when appropriate
- report exactly what changed
- report commands executed
- report remaining errors

## Important Project Areas

Chat:
app/api/chat/

Actions:
lib/actions/

AI:
lib/ai/

Billing:
lib/billing/

Knowledge:
knowledge-related routes and lib files

Shopify:
Shopify integration files

Database:
Supabase migrations, schema and RPC functions

Widget:
widget components and embed code

## Working Style

For major tasks:

1. Inspect
2. Understand
3. Explain the plan
4. Implement
5. Test
6. Inspect errors
7. Fix
8. Test again
9. Summarize

Do not make unrelated changes.