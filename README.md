# Student Success Email Tool

A guided bulk-email wizard for non-technical staff. Upload any Excel/CSV from IT, review participants, upload a Word/text template, preview with real data, test-send, and then send to everyone with a single confirmation.

---

## Running the app — choose your option

### Option A: Run on your own computer (local)

**Step 1 — Install Node.js** (one time only, skip if already installed)
Download from https://nodejs.org — click the **LTS** button and install it like any Mac app.

**Step 2 — Configure email credentials** (one time only)
In the `backend/` folder, copy `.env.example` to `.env` and fill in:
- `SMTP_USER` — your team Gmail address
- `SMTP_PASS` — your Gmail [App Password](https://myaccount.google.com/apppasswords) (not your regular password)
- `SMTP_FROM_NAME` — display name shown to recipients (e.g. "Student Success Team")

**Step 3 — Start the app**
Open a terminal in the `sendingEmailAuto` folder and run:
```bash
bash start.sh
```
Then open **http://localhost:3001** in your browser.
Keep the terminal open while using the app. Press `Ctrl+C` to stop.

---

### Option B: Deploy to the cloud (recommended for teams)

Everyone on your team opens a single URL — no installs, no terminals, works from any browser.

**Step 1 — Push to GitHub**
Create a private GitHub repo and push this project to it.

**Step 2 — Deploy on Railway (free)**
1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo** → select this repo
3. Add environment variables (from your `.env` file) under **Variables**:
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`
4. Railway will build and deploy automatically — you get a public URL

**Step 3 — Share the URL**
Copy the URL Railway gives you (e.g. `https://your-app.up.railway.app`) and share it with your team. That's it.

> **Note:** Your `.env` file is never committed to GitHub — credentials are entered directly in Railway's dashboard.

---

## How to use

1. **Upload** — drag-and-drop your Excel file from IT; confirm which column is the email address
2. **Participants** — review each row, check the people to include (start unchecked by design)
3. **Template** — upload a `.docx` or `.txt`, or type directly; use `{{firstName}}` tokens
4. **Preview & test** — see the email as each participant would receive it; send a test to yourself first
5. **Send** — confirm the sending account, then send to everyone selected

## Limits

- Max 30 emails per minute (enforced automatically)
- Gmail daily cap ~500 emails/day
- Emergency Stop button halts in-progress sends instantly

## Tech stack

- **Frontend:** React + Vite + lucide-react
- **Backend:** Node.js + Express + nodemailer + xlsx + mammoth
- **Storage:** JSON files in `backend/data/` (no database needed)
