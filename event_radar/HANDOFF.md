# Club Event Radar: handoff notes for Angel

## 1. What works now

Website: **https://keanuwidjaja.github.io/BUS4498_InClass_Builds/event_radar/**

- **Posting:** a club officer pastes an announcement, with an optional JPG or PNG flyer up to 5 MB. The AI agent turns it into an event card and checks it against the posting rules.
- **The agent decides one of four results:** published, waiting for a moderator (with reasons), not posted (not an event), or already posted (a duplicate).
- **Event list:** published events, soonest first, with a **Free food** filter. Flyers show on the cards.
- **Moderator sign-in** at the bottom of the page: lists waiting posts with the reason and the original text, plus **Approve** and **Reject** buttons. New sign-ups are turned off, so only accounts made in Supabase can sign in.

## 2. Where things live

- **GitHub repository:** `BUS4498_InClass_Builds`. The website is in the `event_radar/` folder.
- **Supabase project:** `event-radar`, Project URL `https://rzbwzdrnlnjhlwpayxay.supabase.co`.
- **Files that matter** (all in `event_radar/`):
  - `index.html`, `app.js`, `style.css`: the website.
  - `config.js`: the Project URL and the publishable key. Both are public.
  - `supabase/functions/submit-event/index.ts`: the AI agent (an Edge Function).
  - `supabase/migrations/`: the database changes, one file per stage.
  - `context/posting-rules.md`, `context/campus-places.md`: the rules and the place codes. They are copied into `index.ts`, so change both together.
  - `test/sample-announcements.md`, `test/sample-flyer.png`: the test posts.
  - `AGENTS.md`: the build instructions for Claude Code or Codex.

## 3. Secrets

- `ANTHROPIC_API_KEY` is set in **Supabase → Edge Functions → Secrets**. The agent uses it to call Claude (`claude-haiku-5-5`).
- You don't need the value, and it is never in any file. Don't put a secret key, the database password, or an AI key in the repository or in a chat.

## 4. How to test

Use the posts in `test/sample-announcements.md`:

- **Post A** (Board Game Guild game night) → **Published** on Thu, Oct 29, 7:00 to 10:00 PM, UU Room 220, with the Free and Free food tags. Sending it again → **Already posted**.
- **Post D** (house party with BYOB and a Venmo handle) → **Waiting for a moderator**. The reasons are off campus, alcohol, and personal payment details. The phone number and Venmo handle are kept off the card.
- **Post F** (textbook for sale) → **Not posted**, because it isn't an event.

## 5. What's next

- **Old events:** past events drop off the website's list, but they stay `published` in the database. The optional nightly clean-up stage (`pg_cron`) would archive them.
- **Moderators can only approve or reject.** They can't fix a wrong date or title. A post with missing details has to be sent again.
- **Spending limit:** the agent refuses new posts after 100 in 24 hours. Raise it in `index.ts` if the class needs more.
- **Ideas:** let a moderator see rejected posts too, and add more campus places to the list.

## 6. How we take turns

1. **Tell each other before you start working**, so we don't change the same files at once.
2. **Download before you start:** in GitHub Desktop, click **Fetch origin**, then **Pull origin**.
3. **Upload when you stop:** commit your changes with a short message, then click **Push origin**.
4. Database and agent changes go to the shared Supabase project right away, so mention them in your message too.
