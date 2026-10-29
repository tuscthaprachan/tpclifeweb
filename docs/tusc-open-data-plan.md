# TUSC open data: content design

How to present the Student Council Tha Prachan "OPEN DATA 2025" Drive folder on this site. The plan comes from reading all 49 files (the folder is listed in `data/harvested-inventory.ts` as `openData`) and from surveying the existing `/about` section. The plan only; nothing here is built yet.

## What is in the folder

The folder holds 82 entries: 33 folders and 49 files. All but one file are PDFs; the other is a Google Sheet. All are in Thai, except one English translation.

| Drive folder | Files | What they are | Text layer |
|---|---|---|---|
| 1. ประกาศต่าง ๆ | 16 | Rector's announcement of the 30 elected members; executive committee appointments; President's appointments of the joint coordinating committee, 4 standing committees, 3 ad hoc committees, 1 sub-committee, the assistant secretaries-general and the Office of the President; a joint council and union announcement on cheer activities; a 2555 university traffic and parking announcement | 01, 02, 16 are scans; the rest are usable |
| 2. บัญชีรายชื่อสมาชิกสภานักศึกษา | 1 (Sheet) | Members by party (Renew TPC, ReLife) | Text, but it disagrees with the Rector's announcement (see below) |
| 3. ระเบียบ และข้อบังคับ | 9 | University student activities regulation 2563; council regulations on campaigning, the Election Commission, budget criteria, independent groups, SOTUS-type activities, the council itself (2564), Tha Prachan operation and meetings (2569, in Thai and in English) | 18 (26 pages) and 22 are scans; 15, 19, 26 have broken Thai glyphs |
| 4. ระเบียบวาระการประชุม | 3 | One agenda (ordinary session 2, meeting 1) with two sets of minutes attached as papers; the extraordinary session folders are empty | Garbled glyphs in 27 |
| 5. ข้อมูลกองทุน | 9 | A 269 row list of university funds and 8 university fund regulations (2561 to 2566) | All scans |
| 6. รายงานการประชุม | 7 | Minutes of 7 meetings, 13 May 2025 to 19 Mar 2026 | Only 40 extracts cleanly |
| 7. รายงาน กมธ. วิสามัญ | 3 | Budget audit of 7 Student Union projects; budget summary FY 2569; canteen ad hoc committee report | Usable; charts are images |
| อื่น ๆ | 1 | "Thaprachan's Student Welfare 101", a 23 page Canva guide | Garbled |

The folder is ordered by document type, the way the council produces documents. People do not come looking for "ประกาศ" or "ระเบียบ"; they come with a question. The site should be ordered by those questions.

## User needs

Drawn from the documents themselves (about 70 needs in total across the five extracts; the ones that shape the structure):

| As a | I need to | So that |
|---|---|---|
| Student | know who represents me, which committee handles what, and how to reach them | I can raise a problem with the right person |
| Student | see what the council decided, when, and how it voted | I can hold my representatives to account |
| Student | know what happens at the next meeting and what papers it will consider | I can ask a member to raise something, or attend |
| Student | put a motion to the council (25 student petition, operation regulation 2569, clause 39) | my issue is debated |
| Club officer or project lead | know the budget criteria, rates and deadlines | my request is not rejected on a technicality |
| Organiser of a cheer, freshers' or sports activity | know what is banned and what the penalties are (SOTUS-type activities, cheer controls) | the activity is safe and allowed |
| Candidate or party | know the campaign rules and who enforces them | I do not break them |
| Student in financial difficulty or after an accident | know what help exists and how to claim | I get it in time |
| Treasurer, journalist, researcher | download budget figures with their basis and date | I can check and cite them correctly |
| University staff (canteen, finance, facilities) | see the recommendations addressed to my unit | I can respond |

## Structure

Ordered by those needs. GOV.UK formats in brackets.

```
/about/tusc                              Organisation page
  /people                                Who is on the council (people and roles)
  /committees                            Committees (index)
    /[slug]                              One committee: remit, members, reports, decisions
  /meetings                              Meetings (upcoming first, then by session)
    /[session]-[meeting]                 One meeting: agenda, papers, decisions, minutes
  /decisions                             Decisions register (filterable)
  /rules                                 Rules the council works under (document collection)
    /[slug]                              One rule: summary guide, then full text with clause anchors
  /reports                               Reports (publications)
    /[slug]                              One report as HTML
  /budget                                Student activity budget (by fiscal year)
    /[fiscal-year]                       Tables by organisation, project and category
  /data                                  Open data: CSV downloads, data dictionary, licence
  /how-to                                Petition the council, ask a question, contact a committee
```

Funds, the welfare guide and the traffic announcement do not belong under the council. See "Content that moves out".

### Organisation page `/about/tusc`

Replaces the current page, which is a single static column. The order follows GOV.UK organisation pages: what it does, then what it is doing now, then who, then documents.

1. What the council does: one plain paragraph, then a summary list with the facts (established, governed by, number of seats, current term). Keep the existing relation to TUSU.
2. What the council is doing now: the next meeting (date, place, link to its agenda), the latest 3 decisions and the latest report. Each item has a date and links to its page.
3. Who is on the council: President, Vice-Presidents and Secretary-General by name and role, a link to everyone, a link to committees.
4. Get involved: petition, ask a question, contact a committee, all through `/how-to`.
5. Documents: links to rules, reports, budget and data, each with a count and the date it was last updated.
6. Existing button to `/policy?owner=tusc`.

### People `/about/tusc/people`

- Group by role, not by party: Executive committee (President, Vice-Presidents, Secretary-General, Treasurer and so on), then the Office of the President and the assistant secretaries-general, then members.
- One summary list per person: name (Thai, then romanised), faculty, party, roles held across every body, the term, and the appointing announcement as a link to the PDF.
- Party is a fact, not the grouping. A table of members by party with seat counts, row headers and a caption sits underneath.
- A vacancy is a row that says "Vacant" or "Awaiting successor" with its date. This replaces the "รอสืบแทน" and blank rows in the Sheet.
- Show the date the list was checked, and the source announcement. The Sheet is missing 5 people in the Rector's announcement and has 1 extra person, so the Rector's announcement is the source until the council confirms the changes.
- Elected members and appointed officers are named because they hold public office. People appointed only to a sub-committee or as staff appear by name only if the appointing announcement names them, and never with contact details.

### Committees `/about/tusc/committees/[slug]`

One page each for: the joint coordinating committee (with TUSU), the 4 standing committees (politics and democracy, council affairs, budget monitoring, rights, welfare and equality), the ad hoc committees (two budget reviews, canteen) and the canteen sub-committee.

- Remit: the duties in the appointing announcement, rewritten as a short bulleted list in plain language, with the legal basis as a link to the clause (for example "Operation regulation 2565, clause 61").
- Type (standing, ad hoc, sub-committee), parent body, appointed on, and ends on or "When its work is done".
- Members: a table with role, name, faculty.
- Its reports and the decisions it brought to the council.
- Ad hoc committees that have reported are marked "Finished" with the date, using `StatusTag` (icon, word and colour).

### Meetings `/about/tusc/meetings`

The index lists upcoming meetings first. Past meetings are grouped by session ("Extraordinary session 1, 2568"), newest first. Each row shows the date (BE and CE), the meeting, the number of decisions, and the minutes status: "Draft", "Adopted on [date]" or "Not published".

One meeting page:

1. A summary list: date and time, place, chair, attendance (for example "21 of 30 members present; quorum 16"), session type explained in a `Details` element ("An extraordinary session is called outside the two ordinary sessions...").
2. The agenda as an ordered list in the council's standard 8 sections, as HTML, not a PDF. Every item has its own anchor, its type (information, consideration, appointment, budget), and its supporting papers as attachments under it.
3. Decisions: per item, the outcome and the vote totals (for, against, abstain, not voting) as a small table with a caption. The minutes record only totals and party splits, never individual votes, and the site shows exactly that.
4. Minutes: attachment, with status. Draft minutes say "Draft: not yet adopted by the council". Adopted minutes say which meeting adopted them and link to it.
5. "Previous meeting" and "Next meeting" links.

The text of the minutes is not turned into HTML in the first release. The minutes report speakers by name almost verbatim, and one set names a member removed after an allegation. Each set needs an editorial check before it is made searchable. Decisions and attendance are published from them as structured data.

### Decisions register `/about/tusc/decisions`

All 38 resolutions extracted so far, as one filterable list that uses the existing static plus browser filtering pattern (`lib/query-routes.ts`, `QueryBoundary`, works without JavaScript).

- Filters: topic (budget, appointments, rules, welfare, other), outcome (approved, rejected, deferred, noted), meeting.
- Each row: decision in one sentence, outcome tag, vote totals, the meeting and item it came from.
- Policies from `/policy?owner=tusc` that came from a decision link to it, and the other way round.

### Rules `/about/tusc/rules`

A document collection grouped by what the rule is about, not by legal form:

| Group | Documents | Presentation |
|---|---|---|
| How the council works | Operation and meetings regulation 2569 (Tha Prachan); council regulation 2564; English translation of 2569 | Summary guide plus PDF for the 2569 and 2564 regulations, with the 2564 version marked "May be replaced by the 2569 regulation for Tha Prachan" until the council confirms; the English version as an attachment labelled "Unofficial translation. The Thai text is the legal version." |
| Elections | Election Commission regulation; campaigning regulation 2567 | Full HTML with clause anchors for campaigning; summary plus PDF for the Commission. Shows the conflict in penalties between the two in an inset text until the council resolves it |
| Money | Budget criteria regulation | Full HTML, with its rate table as a real table |
| Activities and welfare | SOTUS-type activities; cheer activity controls; independent groups | Full HTML with clause anchors |
| University rules | Student activities regulation 2563 | Full HTML with clause anchors (it is the source of the council's powers, 26 pages, scan only, so it has to be retyped) |

Every rule page has the same shape:

1. Title in Thai, then English. A summary list: issued by, date (BE and CE), status (in force, amended, replaced, status unconfirmed), made under (link to the empowering clause), and what it replaces.
2. "What this means for you": 3 to 8 plain-language points, each ending with its clause ("clause 12").
3. Full text, with one `id` per clause (`#clause-12`) so decisions, committees and other rules can link straight to it. Long texts get a contents list.
4. The original PDF as an attachment.

### Reports `/about/tusc/reports/[slug]`

Each report is an HTML publication (GOV.UK "HTML publication"), not just a PDF link.

- Budget audit FY 2569: one section per project (what happened, what went wrong, what the committee recommends). Its recommendations go into a recommendations table: recommendation, addressed to, urgency, status. Status is "No response recorded" until there is one. One passage in this report makes an unverified allegation against a named member of university staff; it is left out of the HTML pending review.
- Canteen ad hoc committee: findings, then the recommendations table split into urgent and long term. The survey is an image-only bar chart; it becomes a table ("Problems reported, number of mentions") with a note that the sample size and dates are not stated. Link from `/eat` (the canteen pages) to this report.
- Every report shows its author committee, the date it was presented to the council, and the decision that received it.

### Budget `/about/tusc/budget/[fiscal-year]`

Tables first, no charts in the first release (as on `/performance`).

1. At the top: what the figures are and are not. The reports give one figure per line and never say whether it is requested, approved or spent. The page states that: "Amounts as shown in the budget summary report. The report does not say whether these are approved or spent amounts."
2. Fiscal year defined once: "Fiscal year 2569 (2026)", with the period it covers. The council's FY 2569 includes events from August 2025, so the period is taken from the council, not assumed.
3. Tables, each with a caption, column and row headers, right-aligned figures to two decimals, and a total row: by type of organisation; by organisation; by project within each organisation; by expense category; comparison with the previous year (with the 200,000 baht Student Affairs line shown separately so the comparison is like for like).
4. "Known differences in this report" as a list, not hidden: TU HOST total 72,381.40 against 72,381.24 in the detail; ASA TPC categories add up to 170,000 against a total of 313,000; the category table is 1,640 baht apart from the organisation tables on out-of-hours pay. The council is asked to correct the source, and the page says when it was corrected.
5. CSV download links under each table.

`DataTable` already gives captions, alignment and the stacked mobile layout. It needs a total row (a `tfoot`).

### Open data `/about/tusc/data`

One page that lists every dataset: what it contains, the period, when it was last updated, the source document, the licence and links to the CSV and its data dictionary.

| Dataset | Columns (abridged) |
|---|---|
| `members.csv` | person_id, name_th, name_en, faculty, party, role, body, term_start, term_end, appointing_document |
| `committees.csv` | committee_id, name_th, name_en, type, parent, remit_th, remit_en, legal_basis, appointed_on, ended_on |
| `meetings.csv` | meeting_id, session_type, session_no, meeting_no, academic_year, date, venue, chair, present, absent, on_leave, quorum, minutes_status, minutes_adopted_at |
| `decisions.csv` | decision_id, meeting_id, item_no, title_th, title_en, type, outcome, votes_for, votes_against, votes_abstain, amount_thb |
| `budget_lines.csv` | fiscal_year_be, organisation_type, organisation, project, category, amount_reported_thb, amount_basis, source_document, source_page |
| `recommendations.csv` | recommendation_id, report, text_th, text_en, addressed_to, urgency, status, status_date |

CSV files are UTF-8 with a byte order mark so Thai opens correctly in Excel, use ISO 8601 dates and plain numbers without separators, and have no total rows. The licence must come from the council; the recommendation is CC BY 4.0, the open licence closest to the Open Government Licence. These are route handlers that `proxy.ts` must let through.

## Content that moves out

| Document | Goes to | Why |
|---|---|---|
| University fund list and 8 fund regulations | A "Get financial help" task page under services, and a reference list | Only the financial need fund, accident insurance and the graduate fund benefit students directly, and the regulations give no amounts, forms or contacts. The task page says what each fund is for and who to ask (Student Affairs); the reference list says who each fund is for: students, staff or the university. The council's interest (students sit on the accident insurance and student activities committees) is noted on the council page |
| Student Welfare 101 | Split across existing pages: getting around (shuttles), services (rooms, libraries, fitness, printing), welfare (counselling, clinic, insurance claims), exams (TU-GET fees by cohort) | It is a guide, not council data. Each fact gets an owner and a "checked on" date there |
| Traffic and parking announcement 2555 | `/getting-around`, owner `university` | A university rule; it is in the council folder by mistake |
| Cheer activity controls | Rules, group "Activities and welfare", owner `joint` | Issued jointly with TUSU, so it also appears on `/about/tusu` |

## Shared conventions

- Thai is the legal text. English is a translation, labelled once per page.
- Dates show both eras: "8 January 2569 (2026)" in Thai and "8 January 2026" in English with the BE year after. Academic year and fiscal year are always named in full.
- Plain words in English, from one glossary used across the section: Student Council (สภานักศึกษา), Student Union (องค์การนักศึกษา), ordinary session (สมัยสามัญ), extraordinary session (สมัยวิสามัญ), standing committee (คณะกรรมาธิการสามัญ), ad hoc committee (คณะกรรมาธิการวิสามัญ), resolution (มติ), regulation (ระเบียบ), university regulation (ข้อบังคับ), announcement (ประกาศ), clause (ข้อ). The extracts hold about 250 more terms for the strings file.
- Every PDF is an attachment that shows title, file type, size and page count, and says "This file may not be suitable for users of assistive technology" with a way to ask for an accessible format. Scans say "Scanned document: the text cannot be searched or read by a screen reader".
- HTML first, PDF second. The site never relies on Drive links; files are mirrored to public storage so they keep working when the folder changes.

## What has to be built

| Need | Existing | New |
|---|---|---|
| Content | `lib/content`, `lib/db/schema/content`, `/admin/content` with `CONTENT_TYPES` | Migration 0015: `council_people`, `council_bodies`, `council_memberships`, `council_meetings`, `council_agenda_items`, `council_decisions`, `council_documents` (rules, reports, papers, minutes), `council_clauses`, `budget_lines`, `report_recommendations`. Admin content types for each, editable by an `editor` with TUSC scope |
| Files | `lib/storage` (public images only) | A public `document` upload profile for PDFs, with page count read on upload |
| Components | `SummaryList`, `DataTable`, `Details`, `InsetText`, `StatusTag`, `Pagination`, `Breadcrumbs` | `Attachment`, `ContentsList` ("On this page"), clause anchors in rich text, `tfoot` in `DataTable` |
| Filtering | `QUERY_ROUTES`, `QueryBoundary` | Entries for decisions, meetings and rules |
| Discovery | Footer links `/about` | `/about/tusc/**` in the sitemap and search (it is in neither today); the guide page `/guide/rules-and-documents` links to `/about/tusc/data` instead of the Drive folder |
| Data | None | CSV route handlers and the data page |

## Order of work

1. Organisation page, people and committees, from the Rector's and President's announcements. Small, high value, and the source data is clean.
2. Meetings and the decisions register, from the 7 sets of minutes. Structured fields only; minutes stay as attachments.
3. Rules: summaries for all, full text for the campaigning, budget criteria, SOTUS and independent groups regulations (text layers usable). The 2563 university regulation and the scans after retyping.
4. Budget FY 2569 and the two reports, with the recommendations table.
5. Open data page and CSVs.
6. Move the funds, welfare guide and traffic content into the services pages.

## What to ask the council

These block an accurate first release. Send them before building step 1.

1. Members: the Sheet lacks 5 people in the Rector's announcement (including the Secretary-General and the first Vice-President) and has one person who is not in it. Who is a member today, and who are the replacements?
2. The politics and democracy committee has two different chairs in two announcements. Which is right, and from when?
3. Does the 2569 Tha Prachan operation regulation replace the 2564 council regulation for this campus? It has no repeal clause.
4. The campaigning regulation 2567 and the Election Commission regulation set different penalties. Which applies?
5. Budget figures: requested, approved or spent? And the three differences listed under Budget.
6. Agendas and papers for extraordinary sessions 1 and 2, and minutes of extraordinary session 2 meeting 1 once adopted.
7. Editable sources (Word or Google Docs) for the scanned and garbled PDFs, so the text does not have to be retyped.
8. Status of each recommendation in the audit and canteen reports.
9. A licence for the data, and a named contact for corrections.
10. Clearance to publish names that appear in minutes and reports outside the member list, and a decision on the two passages flagged for review.

## Publishing standard for the council

So the next year's folder can be loaded without this clean-up. Suggested as a one-page note to the council secretariat:

- One file per document, named `YYYY-MM-DD_type_short-title` in English letters.
- Export PDFs from the word processor, not scanned, so the text can be read and searched. Sign on a cover page if a signature is needed.
- Date every report and say which meeting received it.
- Budgets as a spreadsheet with one row per line and a column saying requested, approved or spent.
- Keep the member list dated, with a change log, and match it to the latest announcement.
- Put agendas and papers in the folder at least 5 days before the meeting (the 2569 regulation's notice period), and draft minutes within a set number of days agreed by the council.
