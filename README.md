# Demo page: salon WhatsApp assistant

A static page that runs the assistant in the browser: the same src/ modules as the n8n workflow, copied to js/src. Nothing is sent; the page shows the WhatsApp and OpenAI request bodies instead. Deploy the folder to Vercel as is (no build step). vercel.json and robots.txt keep it out of search engines.

## Measured

All figures come from `node tools/measure.mjs` (results/measure.json), `node tools/run_tests.mjs` and `node tools/mutate.mjs`, with the clock fixed at Thursday 19 November 2026, 18:00 Doha time.

- Intent read right: 106 of 109 test-set messages (99 without Arabic normalization) and 28 of 30 held-out messages (25 without). Arabic script alone: 54 of 55 (47 without normalization).
- Reply language right: 109 of 109 and 30 of 30. Service right: 107 of 109 and 30 of 30.
- The test set was written alongside the rules, so it flatters them. The held-out set was written after the rules were frozen, and no rule was changed after it was scored. Its two misses: "ابي اعدل موعدي لبعد بكرة" (a change request read as a new booking) and "Are you open during Eid?" (answered with normal hours).
- Routes for the 139 messages: 115 answered from the salon's data, 10 handed to the front desk, 14 sent to OpenAI. Every one answered without OpenAI got exactly one WhatsApp message back.
- The n8n workflow file (13 nodes), run in tools/n8n_harness.mjs with WhatsApp and OpenAI mocked and $env blocked as in n8n 2.x, produced the same request bodies as calling src/ directly for 139 of 139 messages.
- Webhook stream: 120 messages from 40 customers plus 7 injected retries, 10 forged posts and 360 delivery receipts. The workflow sent 120 replies (none to retries, forged posts or receipts). A handler without signature and duplicate checks sent 137. The 5% retry rate is an input to the simulation, not a measured Meta figure.
- Reminders: a booking three days ahead got one reminder, as the approved template, when the 15-minute schedule reached it, and none again 15 minutes later. Of 168 hourly lead times up to a week, a plain day-before message would fall outside the 24-hour window for 121 if the customer doesn't write again.
- WhatsApp limits: 139 payloads checked, 0 over a limit; longest button title 18 characters.
- Price check on model replies: 10 of 10 written replies with real prices passed, 10 of 10 with invented prices stopped.
- Tests: 29 of 29 pass. Planted bugs caught by the tests: 24 of 24.
- Page checks in Chromium (every scripted conversation, typed Arabic and English, keyboard, axe at desktop and 375 px): 55 of 55 pass.
- Time per message for rules, booking and payload building: median 0.22 ms over 4,170 runs, no network.

## Not measured

- No OpenAI call was made. Answer quality for questions outside the salon's data is untested; only the request format and the price check are.
- No WhatsApp number was connected. Nothing was delivered, and the `appointment_reminder` template has not been submitted or approved.
- n8n itself was not run (the build machine has Node 22; n8n 2.x needs Node 24). The harness imitates the node types this workflow uses; it is not n8n.
- The salon, its prices, staff and hours, and every customer message in data/ are invented.
- Voice notes, images and stickers go to the front desk; nothing is transcribed or read.
- A customer who asks in Arabic for the English price list still gets Arabic.
- Bookings and the duplicate list live in n8n workflow static data. That suits a demo; a busy salon needs its booking system or a database, and static data is only saved for production executions.
- Holiday hours (Eid, National Day) are not modelled.
