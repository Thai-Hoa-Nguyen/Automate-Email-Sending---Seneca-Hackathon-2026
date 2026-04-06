

name: Guided Email Wizard Plan
overview: Phase 1 plan for a non-technical Student Success team — universal Excel ingestion, participant review, docx/txt templates, test send, visible sending-account identity (avoid wrong-domain mistakes), merge personalization, safe throttles, refresh-safe campaign state.
todos:





id: wizard-ui
content: Design the 3-step wizard UI and plain-language messaging in App.jsx
status: pending



id: merge-preview
content: Add merge-token personalization and live preview from first valid spreadsheet row
status: pending



id: validation-report
content: Implement row validation and Needs Fix reporting for missing Email/name data
status: pending



id: rate-limit-send
content: Enforce 30 emails/min throttle and row-level send result tracking in email service
status: pending



id: campaign-persistence
content: Add backend campaign status persistence and polling endpoints for refresh recovery
status: pending



id: emergency-stop
content: Implement Emergency Stop endpoint and frontend control with immediate UI feedback
status: pending



id: duplicate-lock
content: Add single active campaign backend lock to prevent duplicate concurrent sends
status: pending



id: it-export-mapping
content: Universal sheet ingestion — detect all columns + sample values; heuristic roles; staff confirm mapping for any IT layout
status: pending



id: dedupe-one-per-email
content: Normalize + dedupe emails before send; first row wins; tag duplicate rows in report; idempotent send per campaign
status: pending



id: participant-review-ui
content: Participant table with per-row status + opt-in checkboxes; send only to checked, verified rows
status: pending



id: template-library
content: Upload templates from .docx or .txt; import into editor; save/edit in-app; optional template list for reuse
status: pending



id: test-send
content: "Send test email" to a chosen address using current subject/body + merge data from a selected sample row; no campaign progress
status: pending



id: sending-identity
content: Persistent UI + API readout of sender address/domain (no secrets); optional Check mail settings; confirm step before bulk
status: pending
isProject: false



Phase 1 Plan: Guided Student Email Wizard

Goals





Convert the app into a guided wizard for non-technical staff: Upload & map columns → Review participants (status + checkboxes) → Choose / edit template → Preview → Send.



Auto-personalize each email from spreadsheet data (First Name, Last Name, Email, ID, etc.) as exported from IT.



Exactly one email per recipient address among selected rows (personalized with that row’s name data), plus preserve send status after refresh.

IT spreadsheet assumptions (from portal export)





You do not need to know the column layout in advance. Staff upload whatever Excel/CSV IT provides; the app discovers columns and items (fields) automatically, then applies smart guesses so your team only confirms—not hand-types—column roles.



Typical columns: First Name, Last Name, Email, ID (and possibly Preferred Name, NetID, program, cohort)—but any extra columns still appear as usable merge fields.



Headers may not match exactly (spaces, casing, abbreviations). The app should auto-guess common patterns and offer dropdown mapping when unsure.



Required for send: a valid Email column mapped to one column (required).



Recommended for personalization: at least one name-related column; if missing but Email is valid, send with generic greeting (see Personalization rules).

Universal upload: auto-detect columns and “items”





Discover structure: On upload, parse the file (first worksheet by default; if multiple tabs, offer a sheet picker so the right table is chosen).



Header row: Treat row 1 as headers by default. If the file has title rows or blank rows above the table (common in exports), support “Header is on row N” (auto-suggest by finding the first row with multiple non-empty cells and at least one cell looking like an email header or email-like label—or let staff pick one row as header).



List every column: Build a Column inventory: for each column, store headerLabel (as in file), a stable fieldSlug for merge tokens (e.g. sanitize "Program Name" -> programName), and sample values from the first few data rows (not header) for preview.



Heuristic role assignment (not magic, but helpful):





Email: header matches synonyms OR column’s sample values mostly look like emails (@, domain pattern).



First / last name: header synonyms + sample values look like person names (not numeric IDs).



ID: header synonyms + mostly numeric/alphanumeric IDs.



Mark confidence (e.g. “Likely email”) so staff trust but verify.



Staff confirmation UI (“What we found”): A simple table: Column name | Sample value | Role (dropdown: Email, First name, Last name, Full name, Student ID, Ignore, Custom passthrough). Email role must be assigned exactly once before continuing.



Merge tokens for everything passthrough: Any column not mapped to a built-in role is still available as {{fieldSlug}} from the inventory so every IT field can be used in the body if needed.



Edge cases: Merged cells, empty column headers, or multiple columns named the same—show plain-language fixes (“Rename empty column in Excel” / “We labeled the second ‘Email’ as Email 2—please map which one to use”).

Personalization rules (merge + greeting)





Canonical merge tokens (what staff type or pick from a token picker): e.g. {{firstName}}, {{lastName}}, {{fullName}}, {{email}}, {{id}}, plus optional passthrough columns as {{columnSlug}} after mapping.



Greeting helper (optional preset): e.g. "Hi {{firstName}}," with logic:





Use First Name when present.



Else use Preferred Name if mapped.



Else build fullName from first + last when both exist.



Else last name only if that is all you have (optional product choice).



Else if Email is valid but all name fields are empty: use a generic greeting (e.g. "Hello,") and still send (do not skip for missing name alone).



Preview: default to the first checked row that is eligible to send; allow switching “Preview as:” to another checked row so staff can spot-check names.

Participant list: review, status, and opt-in selection





Why: Staff want to see everyone from IT’s file, verify names/emails, and only send to rows they approve—not blind-send the whole sheet.



Table columns (minimum): checkbox (include in this send), name preview (from mapped fields), email, student ID (if mapped), Status, optional key passthrough columns for context.



Checkbox default: unchecked for every row. Staff manually check each participant after reviewing that row’s information (opt-in). Provide Select all eligible only as a secondary shortcut (clearly labeled) if you want power-users to speed up later—default UX stays review-first.



Status values (plain language): e.g. Ready to review, Ready to send (valid + checked), Missing email, Invalid email, Duplicate email, Sent, Failed, Skipped. Rows that cannot send show disabled checkboxes with a short reason tooltip.



Scope of send: Dedupe and sending apply only to checked, eligible rows. Unchecked rows are never emailed in that run.



After send: Same list remains the source of truth for who was contacted; statuses update live during send + after refresh (backend-backed).

Templates: upload (.docx / .txt) + edit in-app





Upload from computer: Accept .txt (plain text / UTF-8) and .docx (Word). .txt maps directly to email body (and optional separate subject field in UI). .docx requires import/conversion to HTML or plain text for email (plan implementation: use a well-supported docx-to-HTML/text library server- or client-side; preserve basic paragraphs and bold where feasible; document that complex Word layouts may simplify).



Subject line: Either a dedicated Subject field in the app (recommended) plus body from template, or first line of .txt convention—prefer explicit Subject field so Word docs don’t confuse users.



In-app editing: After upload, show a Template editor (rich-enough for staff: formatted text, merge token picker, undo). Staff can tweak wording without re-uploading. Edits are what the campaign uses.



Flexibility: Support multiple saved templates (name + last updated) so the team can reuse “Welcome”, “Reminder”, etc., without re-importing files each time (storage: backend or local-first—prefer backend if multi-user).



Merge tokens: Same {{firstName}}, etc., in templates; token picker in editor to avoid typos.

Test send (try template before bulk)





Purpose: Let staff send one real email (usually to themselves or a team inbox) to verify formatting, subject line, and merge fields before starting the full emailService / campaign send.



Placement: On the Template and/or Preview step, add a prominent “Send test email” area—separate from “Start send to selected participants” so the two actions are never confused.



Inputs:





Deliver to: text field for the test recipient address (default empty or optional “use my work email” if the app stores a profile later).



Preview as row: dropdown to pick which spreadsheet row to use for merge data (same as preview row picker)—so the test shows realistic {{firstName}} etc., not dummy data.



Behavior:





Uses the same rendering path as bulk (subject + body + merge) and the same SMTP configuration.



Does not create or advance a campaign job, does not mark any participant row as Sent, and does not consume the bulk-send checklist—purely a smoke test.



Show clear success/failure (“Test email sent—check your inbox” / plain-language error with fix hints).



Limits: One-off sends still respect basic rate limits (negligible vs bulk); optional small cooldown (e.g. one test per 30s) only if abuse becomes a concern—default no friction for Phase 1.



API shape (planning): e.g. POST /send/test with { to, subject, body, sampleRowId } or server-side render from templateId + row—must be separate from POST /campaign/start.

Sending account visibility (avoid wrong domain / wrong mailbox)





Problem: Staff must always know which mailbox (and domain) the app uses for SMTP so they do not accidentally send student mail from a personal address, wrong alias, or non-institutional domain.



Persistent UI: A fixed header or sidebar strip visible on every wizard step (and during send): e.g. “Sending as: success-team@school.edu” plus optional display name if configured (From: Student Success <success-team@school.edu>). Show the domain prominently (many mistakes are domain-level).



Source of truth: Values come from the same server config / env that nodemailer uses (SMTP_USER, auth.user, or from address)—never guess on the client. Expose a read-only endpoint that returns safe fields only (address, display name, reply-to if set)—no passwords, no connection strings.



API (planning): e.g. GET /email/sender → { fromEmail, fromName?, domain, replyTo? }. If SMTP is misconfigured, return a clear error state for the banner (“Mail not configured—contact admin”).



Check connection (optional but helpful): Reuse or extend a non-jargon action like “Check email connection” that verifies SMTP auth and reflects result next to the sender strip (aligned with your original “Check Connections” wording).



Before bulk send: On the final confirmation for Start send to selected participants, repeat one line: “Messages will be sent from success-team@school.edu.” Require explicit confirm (modal or checkbox: “I confirm this is the correct sending account”) for Phase 1—cheap insurance against embarrassment.



Test send: The test-email panel repeats the same Sending as line so a test received in the inbox matches what bulk will use.

Confirmed Product Decisions





Name formatting: Prefer First Name, fallback to other available name fields.



Missing data policy: Skip rows with invalid or missing Email and show a Needs Fix report. Rows with valid Email but no name use a generic greeting and still send.



Status persistence: Backend job tracking as source of truth.



Duplicate protection: Backend single active campaign lock.



Same spreadsheet, same email twice: send once to that address using the first checked eligible row’s order (or first row order among checked)—first row wins among selected rows; other rows with the same email are marked Duplicate email and cannot be selected for a second send to that address in the same run.



Recipient selection: Checkboxes start unchecked; staff opt-in per row after verifying data. Sending only processes checked rows.



Template sources: .docx and .txt upload, then edit in-app before send.



Test send: Allowed and encouraged before bulk; does not affect participant send status or campaign state.



Sending identity: Always visible sender address/domain in UI; confirm before bulk send.

One email per person (non-negotiable behavior)





Normalize addresses before comparing: trim spaces, lowercase domain-safe comparison (document Unicode edge cases; ASCII typical for school email).



Dedupe key: one logical send per normalized email within a single campaign, considering only rows the staff checked for this send. If two checked rows share an email, first in sheet order among checked rows wins; the other is treated as duplicate for that run.



Idempotency: once a recipient is marked sent for campaign id, the sender must not send again for that recipient if the job retries, reconnects, or the user refreshes mid-send—backend state is authoritative.



UI: before send, show “N selected → M unique email addresses after dedupe” so staff see the effect of checkboxes + duplicates.



Out of scope for Phase 1 unless you add later: blocking a second campaign to the same email next week (would need a cross-campaign suppression list / org policy).

Column auto-detect (planning defaults)





Map likely IT headers to roles: e.g. Email, E-mail, Email Address, Student Email -> email; First Name, First, Given Name -> firstName; Last Name, Surname, Family Name -> lastName; ID, Student ID, EMPLID -> id.



Always show a short “Confirm columns” step after upload (can be one screen): even when guesses are confident, a non-technical team should see what the app will use for Email before any send. If everything is high-confidence, keep it to one click (“Looks good — continue”).

Sending limits (align all layers)





Gmail daily cap: respect ~500/day (document for operators; enforce soft cap in UI if possible).



Safety batch (original prompt): e.g. 10 emails per 3 seconds as an upper burst—must still respect 30 emails/min global throttle (stricter rule wins).



Implement throttle in one place (sender loop) so UI and server cannot disagree.

File-Level Implementation Outline





Frontend wizard and UX copy in [/Users/swagyvc/Documents/sendingEmailAuto/App.jsx](/Users/swagyvc/Documents/sendingEmailAuto/App.jsx)





Step 1 (Upload & mapping): parse file, inventory all columns + samples, heuristic role detection, confirm mapping UI, validate rows.



Step 2 (Participants): sortable/filterable table with status + checkboxes; bulk actions optional; show counts (selected / issues).



Step 3 (Template): upload .txt / .docx, import into in-app editor, set subject, insert merge tokens, save template (library).



Step 4 (Preview): live preview with row picker; Send test email (to arbitrary address, merge from chosen row).



Step 5 (Send): progress panel, Emergency Stop, per-row status updates, exportable summary.



Sending orchestration in [/Users/swagyvc/Documents/sendingEmailAuto/emailService.js](/Users/swagyvc/Documents/sendingEmailAuto/emailService.js)





Shared render + send helper used by test send (single recipient) and campaign send (queue).



Build personalization payload per participant.



Enforce global throttle (<=30 emails/min) and batch policy.



Track row-level outcomes (sent, failed, skipped_missing_data, skipped_duplicate_email).



Backend job state endpoints (new or extended backend files)





GET /email/sender (name TBD) -> read-only sender identity for UI banner; no secrets.



POST /send/test (name TBD) -> one email; no campaign side effects.



POST /campaign/start -> create campaign + acquire active lock.



GET /campaign/:id/status -> return persisted row-level progress.



POST /campaign/:id/stop -> Emergency Stop.



GET /campaign/active -> recover active campaign after refresh.

Data/State Model (Phase 1)





Campaign:





id, status (running|stopped|completed|failed), createdAt, startedBy.



Participant row:





rowId, email (normalized for logic), firstName, lastName, included (checkbox), renderedSubject, renderedBody, result, errorMessage, optional duplicateOfRowId when skipped as duplicate.



Template:





id, name, subject, bodySource (docx|txt|app), bodyHtmlOrText, updatedAt.



Summary:





total, sent, failed, skipped, remaining, lastUpdatedAt.

Send Flow

flowchart TD
    uploadSheet[UploadSheet] --> detectColumns[DetectColumns]
    detectColumns --> mapColumns[MapMissingColumns]
    mapColumns --> validateRows[ValidateRows]
    validateRows --> participantTable[ParticipantTableOptIn]
    participantTable --> importTemplate[ImportDocxOrTxt]
    importTemplate --> editTemplate[EditTemplateInApp]
    editTemplate --> dedupeSelected[DedupeCheckedRowsByEmail]
    dedupeSelected --> livePreview[LivePreviewCheckedRow]
    livePreview --> sendTestEmail[SendTestEmail]
    livePreview --> startCampaign[StartCampaign]
    startCampaign --> sendLoop[SendLoopRateLimited]
    sendLoop --> persistStatus[PersistRowResult]
    persistStatus --> pollStatus[FrontendPollStatus]
    pollStatus --> userStop{UserStops?}
    userStop -->|Yes| stopCampaign[StopCampaign]
    userStop -->|No| sendLoop

UX/Content Rules





Replace technical terms with action guidance (e.g., "We couldn’t send to this address. Please check the email column value.").



Show a visible badge for Skipped (Needs Fix) rows before and after send.



Show "safe send rate" and remaining count so staff understand pace.



Empty selection: If no rows are checked, block Start send with a friendly message (“Check the participants you’ve verified.”).



Test vs bulk: Label buttons distinctly (Send test email vs Send to selected participants); short helper text under test: “This does not email your list.”



Sending as: Always show from address and domain; bulk send requires confirm that the account is correct.

Acceptance Criteria





User can upload an arbitrary IT-exported spreadsheet (unknown column count/names ahead of time); the app lists all columns, shows sample values, assigns best-guess roles, and lets staff adjust before design/send.



Participant screen: Scrollable list of all rows with status and checkboxes; only checked rows are included in send; unchecked rows are never emailed.



Templates: User can upload .docx or .txt, see content in the in-app editor, change subject/body, save for reuse, and use merge tokens.



Multi-sheet workbooks: user can select the correct worksheet (or app defaults to first sheet with a visible warning if multiple tabs exist).



Preview renders with real participant data for a chosen checked row before sending.



Test send: User can send one message to an address they enter (e.g. their own) using the current template and merge data from a chosen row; bulk list/campaign state is unchanged afterward.



Sending account: The UI always shows which mailbox/domain will send mail (from server config); no secrets exposed; user confirms sender identity before bulk send.



Sending never exceeds 30/min.



Refreshing page restores campaign progress from backend.



Emergency Stop halts in-progress campaign and marks final status.



Invalid rows are skipped and exported/listed in a needs-fix report.



Duplicate emails in the same file result in one send per address (first row wins); duplicates appear in a Duplicate email section of the report.



Retries or refresh cannot cause a second successful send to the same recipient within the same campaign (idempotent send state).

