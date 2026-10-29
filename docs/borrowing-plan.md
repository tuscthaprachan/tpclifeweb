# Equipment borrowing: service design

Replaces the "แบบฟอร์มขอใช้อุปกรณ์ อมธ. ท่าพระจันทร์" Google Form and the four paper forms that had to be downloaded, filled in and uploaded with it (sports, recreation, two-way radio, first aid). Built on the case engine (`lib/cases`) like lost and found and complaints, to the same standards (`docs/backend-plan.md`).

## What the old forms were trying to do

Stripped of their layout, the Google Form and the PDFs ask the same eight things:

| Need | Where it was asked | Problem |
|---|---|---|
| Who is borrowing, and on whose behalf | Form page 2 (name, student number, faculty, year, unit) and again on the PDF (name, position or student number, unit or faculty, phone) | Asked twice; year and position serve no purpose; non-Thammasat borrowers had a free-text field bolted on |
| What, and how many | One radio button per category page, so one item per submission; quantity in a separate free-text box; again on the PDF | A football match needing balls, nets and a stopwatch took three submissions and three PDFs |
| When to collect and return | Form date and time fields, and again on the PDF | No way to know whether anything was free on those dates |
| What it is for | PDF only: event name, place of use, purpose | Hidden in an upload, so not searchable or checkable |
| Agreement to the terms | PDF signature under six clauses | Clauses 1 to 5 identical on every form; only clause 6 differed |
| Notice | Footnote: 3 working days, "no urgent requests"; radios: 7 days | Not enforced; discovered after submitting |
| Deposit | Clause 5: original student or ID card per item; radios: 2 cards | Not stated at the point of collection |
| PDPA | A consent radio with a "do not consent" option | Consent is the wrong basis: the data is needed to lend the equipment. A privacy notice is what is owed |

The officer side was the bottom half of the PDF: approve or decline with a comment and signature; at return, the borrower's and the officer's view of the condition (normal, damaged or lost, compensation taken) with signatures. Nothing recorded what was actually handed over, whether a card was held, or which loans were overdue.

## Principles applied

- **Dates first, then items.** Availability depends on the period, so asking the period first lets every item show how many are free for those dates. Nothing is chosen that cannot be lent.
- **One request, many items.** A basket across all categories, with quantities.
- **Ask once.** Each fact appears in one place. The PDF and the upload disappear: everything on them is asked as a question.
- **Do the hard work.** Notice periods, radio caps, desk hours and stock are checked as the person answers, on the page they relate to.
- **The signature becomes an agreement.** The person reads the shared terms plus the terms for the categories they chose, and agrees once. The terms version and time are stored.
- **Only what is needed.** Year of study and position are dropped. Student number, faculty, phone and an optional email stay. The PDPA consent radio becomes a privacy notice.
- **No account.** A reference and private tracking link, as for the other services.

## Borrower journey

Start page `/[locale]/borrow`: what can be borrowed, notice periods, what to bring, link to the availability calendar, Start now. Question pages at `/[locale]/borrow/<step>`, one thing per page, working without JavaScript (post, redirect, get), draft held server side and encrypted, as in `/complaints`.

| # | Step id | Question | Inputs | Notes |
|---|---|---|---|---|
| 1 | `dates` | When do you need the equipment? | Collection date (date input) and time (select of desk slots); return date and time | Desk days and hours only; at least the shortest category notice (3 working days) ahead; at most 90 days ahead; at most 14 days long |
| 2 | `items` | What do you want to borrow? | Checkboxes grouped by category (fieldset per category) | Each item's hint: "4 free for your dates" or "None free for your dates" (not selectable). A category whose notice the dates do not meet is shown with the reason and its items are not selectable, with a link to change dates |
| 3 | `quantities` | How many do you need? | A whole-number input per chosen item, with its unit | Up to what is free and the item cap; category caps (radios: 13 in total) |
| 4 | `event` | What is the equipment for? | Event or project name; where it will be used; what it will be used for (textarea, 500) | |
| 5 | `group` | Who are you borrowing for? | Radios: a student organisation, club or project (reveals its name) / myself | |
| 6 | `student` | Are you a Thammasat University student? | Yes / No | |
| 7 | `details` | Your details | Full name; if a student: student number (10 digits) and faculty (select); if not: university or organisation | |
| 8 | `contact` | How can we contact you? | Mobile number (required); email (optional, for the tracking link, decision and return reminder) | |
| 9 | `terms` | Borrowing terms | Shared terms, the chosen categories' own terms, what to bring (cards needed), one checkbox "I agree" | Replaces the signature |
| 10 | `check` | Check your answers | Summary lists with Change links | Re-validates everything, including availability |
| 11 | `confirmation` | Request sent | Panel with reference; tracking link shown once; email me the link; what happens next | |

Changing dates from Check your answers re-checks quantities; if something no longer fits the person is taken to `quantities` with the error.

Tracking: `/[locale]/borrow/track` (reference plus private link, as for complaints) shows the status, the items, the period, the public updates and, while requested or approved, a "Cancel this request" page.

Availability calendar: `/[locale]/borrow/availability`. Choose an item (GET form, works without JavaScript); a month grid shows for each day how many are free all day, with a previous and next month link. Days the desk is closed are marked. On narrow screens the grid becomes a list of days. `?date=YYYY-MM-DD` shows every item for one day instead. Figures are worked out from bookings, so the page says they are a guide and the request confirms them.

## Officer side

Role `equipment_officer` (held for TUSU), plus `unit_lead` and `admin`.

Statuses (`lib/cases/services.ts`, kind `loan`):

```
requested ─▶ approved ─▶ on_loan ─▶ returned
    │            │            └────▶ compensation_due ─▶ settled
    ├▶ declined  ├▶ not_collected
    └▶ cancelled └▶ cancelled (borrower or staff)
```

Requested and approved requests, and loans on loan, hold stock. Overdue is computed (on loan past `return_due_at`), never a status.

Case page panel (`/admin/cases/<id>`), by status:

- **Requested.** Facts, lines with free stock excluding this request, other requests clashing on the same items. Approve (optionally lower quantities; optional note to the borrower) re-checks stock with the rows locked. Decline needs a reason, shown to the borrower.
- **Approved.** Record collection: condition checked with the borrower (checkbox), deposit held (student card, national ID card, other; how many; never the number), optional note. Or mark not collected, or cancel.
- **On loan.** Record return: per line, how many came back good, damaged or lost (default all good); deposit given back; if anything is damaged or lost, the amount to pay and a note, and optionally take those units out of service. Ends in returned or compensation due.
- **Compensation due.** Record settlement: paid, replaced or waived, with a note; deposit given back.

Each step is an audited case event with a public update where the borrower should see it. Personal details (student number, affiliation) are shown only on request, and each view is logged.

Console pages:

- `/admin/borrowing`: today's collections, returns due, overdue loans, requests waiting for a decision, and the next seven days.
- `/admin/borrowing/calendar`: the availability month grid for an item, with each day's bookings by reference.
- `/admin/borrowing/items`: categories (notice, cap, cards, own terms, active) and items (names, unit, total, out of service, cap, order, active).

## Notifications and jobs

Email, only when the borrower gave an address: the tracking link (on request from the confirmation page), the decision, a reminder the working day before return, and one overdue notice. Daily cron `/api/cron/borrowing` sends reminders and overdue notices and sweeps abandoned journeys.

## Privacy

Personal data: name, phone, email (case contacts), student number and affiliation (encrypted on the request). Deleted one year after the case closes by the existing retention job. Privacy notice at `/[locale]/borrow/privacy`.

## Assumptions to confirm with the TUSU desk

- Stock counts (seeded as placeholders), desk days and hours (Monday to Friday, 09:00 to 17:00), longest loan (14 days), how far ahead (90 days).
- Whether one card per request is enough for non-radio loans (the paper says per item).
- Public holidays are not modelled in notice periods.
