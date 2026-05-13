# Welcome — from Bu Sari

Hi. I'm Bu Sari. Customer Success Lead. I've been here 8 years, which means I've watched
3 CTOs come and go and I've answered the angry phone call from Tanjung Perak about a
stuck container at least 4,000 times. So I'm going to walk you through this codebase
the way I wish someone had walked me through it.

Read these in order. Yes, all of them. Yes, even the ADRs. Especially the ADRs.

1. **This file.** Take a breath. Make tea.
2. [`01-tech-overview.md`](./01-tech-overview.md) — what we have, why we have it, what we wish we had.
3. [`02-deployment.md`](./02-deployment.md) — how things actually go to production. (Not what the playbook says. What we actually do.)
4. [`03-on-call.md`](./03-on-call.md) — who you page, when, and what NOT to do at 3am.
5. [`04-the-oracle-migration.md`](./04-the-oracle-migration.md) — the migration we started in 2021 and have not finished. Read this BEFORE you touch any model that has the word `Shipment` in it.
6. [`adrs/`](./adrs/) — read all three. They're short.

## A few things I want you to internalize before you write a single line of code

**One.** This codebase looks like it was written by ten different people who didn't talk to each other, because it was. Don't be the eleventh. If you don't know why something is the way it is, ASK before you "clean it up". I am serious. Ask in `#tech-help`. Tag me. Tag VP Eng. There is almost always a reason. The reason is sometimes "we forgot" but often it is "a real customer in Surabaya depends on this exact bug".

**Two.** The `backend-legacy/` PHP system is older than some of you. It is also load-bearing for our entire invoicing pipeline. There is a real plan to retire it (ADR 0001 explains why we haven't). Until that plan ships, **do not change anything in `backend-legacy/` without a runbook and a rollback plan and a coffee with VP Eng.** If a ticket says "small fix in the legacy", it is never a small fix. Bump it back.

**Three.** Half of our database is on its way from Oracle to Postgres. The migration started in 2021. It is, depending on how you count, 60% done. Some tables live in both. Some tables live in Postgres but the legacy code still queries Oracle for them, and there is a sync worker that keeps them in step (mostly). When in doubt: read the migration doc, then ask. Do not assume `SELECT * FROM shipments` returns what you think it returns.

**Four.** When the customer portal goes down on a Friday afternoon, do not start with the customer portal. Start with `backend-modern`'s tracking router. Start with the legacy DB connection pool. Start with whether the BPN ports integration is timing out. The portal is almost never the problem; it's usually the messenger.

**Five.** Indonesian customers will mix Bahasa and English in tickets. Don't standardise. Don't "fix" the strings file to be English-only. If a label says "Lacak Pengiriman", it's there because a customer literally complained when we changed it. Same for AWB vs resi vs nomor pengiriman — we use all three depending on context. Ops can explain.

## How to ask me things

- Slack: `@bu.sari` in `#tech-help`. I see them. I usually reply within an hour during business hours.
- I do not do DMs unless it's HR or production-down. Ask in public; the next engineer who joins will thank you.
- If you are pairing with a customer issue, drop the ticket ID and the AWB. I'll pull the call recording.

## How to NOT ask me things

- Don't ask me to "explain the architecture in 5 minutes". Read `01-tech-overview.md` first, then bring specific questions.
- Don't ask me to approve a `backend-legacy/` change. I am Customer Success, not Eng Lead. Talk to VP Eng.
- Don't open a PR called "small refactor" against the legacy. I will close it. With love.

Welcome to Nusantara. We move boxes. We move them across an archipelago. The code is messy because the world is messy. Be patient with the codebase, and it will (mostly) be patient with you.

— Bu Sari

> *PS: If you're reading this on your first day and feeling overwhelmed: that's normal. Make a list of everything you don't understand, send it to me at the end of the week, and we'll go through it together. Nobody onboards in less than a month here. Nobody.*
