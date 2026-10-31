# Student body open data: content design

How to publish the Student Council Tha Prachan (TUSC) "OPEN DATA 2025" Drive folder on this site, in a section that will also hold the Student Union's (TUSU) open data. GOV.UK ethos for structure and words; the ONS Design System for anything with numbers in it. Mock-ups: `docs/mockups/open-data/` (static, sample content from the real documents; open `index.html` directly).

Decisions taken with the product owner:

| Question | Decision |
|---|---|
| Where it lives | `/about/open-data`, split into `/about/open-data/tusc` and `/about/open-data/tusu` |
| TUSU | Placeholder for now: the section exists, says nothing is published yet, and links to TUSU's own page |
| Charts | ONS pattern: a chart is always followed by its table and a CSV download |
| Minutes | Published in full as HTML, as the council published them, including debate and names |
| Documents that are not council business (fund regulations, the welfare guide, the 2555 traffic announcement) | Both: listed in TUSC open data as source documents, and their content worked into the relevant service pages |
| Scanned and garbled files | Fully transcribed from the page images |
| Licence | Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0) for all published data and documents |
| Errors or inconsistencies in the source | Not reported. Open data is served as published: values, totals, dates and wording exactly as printed, with no commentary |

## The source

The folder holds 49 files in 33 folders: 48 PDFs and one Google Sheet. All 49 were read page by page as images (411 pages) and transcribed into clean Thai text with the printed clause and item numbers kept, because the PDFs cannot serve as the published text:

- 14 are scans with no text at all (01, 02, 16, 18, 22, 30 to 38).
- 13 more have a text layer that cannot be searched reliably in Thai (03, 04, 06 to 14 headings, 15, 19, 26, 27, 39, 41 to 45, 47, 49).
- 28 and 29 are unsigned drafts of 41 and 42. Both are published; the drafts are listed as replaced by the signed versions.
- 25 is the official English translation of 26.

Transcription conventions, so the build can parse them: YAML front matter (title in both languages, type, issuer, reference, date in both eras, signatory, pages, scan), `<a id="clause-12">` before every clause, `<a id="item-6-1">` before every agenda item, tables as tables, charts as tables with "[อ่านค่าจากกราฟ]", `[อ่านไม่ออก]` for illegible text, `[?]` for doubtful letters. Printed text is kept exactly as printed, with no corrections, markers or notes. Sub-clause lists carry the printed numbers ("(1)", "ก.") and must be rendered without a second, generated number.


The transcriptions are in `data/open-data/tusc/transcripts/NN.md` (all 49 files), the conventions in `data/open-data/tusc/TRANSCRIPTION.md`, the index of all 49 source files with Drive paths and metadata in `data/open-data/tusc/manifest.json`, and the tables in `data/open-data/tusc/tables/` (funds, budget lines, the members Sheet).

## How the section is organised

The folder is sorted by document type, which is how the council produces documents. People arrive with a question, so the site is sorted by question, with every document still reachable in its original form.

```
/about/open-data                         Open data: what it is, TUSC and TUSU, licence, how to report a problem
  /tusc                                  TUSC open data: main points, section navigation, what is new
    /people                              Who represents you
    /committees                          Committees
      /[slug]                            One committee
    /meetings                            Meetings, by session
      /[slug]                            One meeting: agenda, attendance, votes, full minutes
    /decisions                           Decisions register
    /rules                               Rules the council works under
      /[slug]                            One rule: what it means for you, then the full text
    /budget                              Student activity budget, by fiscal year
      /[fiscal-year]                     Budget for one year
    /reports                             Committee reports
      /[slug]                            One report
    /funds                               University funds
    /documents                           Every source document (document collection)
      /[slug]                            One document: HTML text, original file, metadata
    /data                                Datasets (CSV) and data dictionary
  /tusu                                  TUSU open data (nothing published yet)
```

`/about/tusc` and `/about/tusu` stay as the bodies' own pages and each links to its open data. Every page under `/about/open-data/tusc` carries the same section navigation (ONS section navigation, vertical on desktop, a wrapped list on a phone): People, Committees, Meetings, Decisions, Rules, Budget, Reports, Funds, Documents, Data.

### Open data landing `/about/open-data`

- One paragraph on what open data is here: documents and figures the student bodies publish so students can see what they decide and spend.
- Two cards with the same structure, one per body: name, what is published, number of documents and datasets, date last updated. The TUSU card says "Nothing published yet" and links to `/about/tusu`.
- Licence, how to cite, how to report a mistake, and the contact for each body (team name and shared address, never a person).

### TUSC open data `/about/open-data/tusc`

Modelled on an ONS release page.

1. Title, one-line summary (under 160 characters), and a metadata list: published by, last updated, next update ("To be announced" until the council sets a schedule), contact.
2. Key figures, 3 tiles: council members (30 seats, 26 Renew TPC, 4 ReLife); decisions in academic year 2568 (38 across 7 meetings); student activity budget FY 2569 (1,988,223.24 baht, up 0.9% on FY 2568).
3. Main points, up to 6, in plain words: for example, "The council met 7 times between 13 May 2025 and 19 March 2026 and every recorded vote passed with no votes against."
4. What is new: the 5 latest items across meetings, decisions, reports and documents, each with type and date.
5. Section navigation as above, with one line under each link saying what is there.

### People `/about/open-data/tusc/people`

- Grouped by role, not by party: President and executive committee; Office of the President and assistant secretaries-general; members.
- Each person once, with all their roles in one description list (name in Thai, then in Latin letters; faculty; party; each role with its body and the announcement that made it, linked to the document and clause).
- Vacancies are rows: "Vacant since 26 May 2025 (minutes, item 6.1)".
- Below, a table of seats by party (caption, row headers, totals row) and a bar chart is not used: two numbers need no chart.
- The source is the Rector's announcement of 8 May 2568 plus later appointments and the minutes. The members Sheet is listed as a source document.

### Committees

Index: a table of all 11 bodies (joint coordinating committee, 4 standing committees, 3 ad hoc committees, canteen sub-committee, Office of the President, assistant secretaries-general) with type, chair, members, appointed on, status (StatusTag: "Active", "Finished").

One committee: remit in plain bullet points with the legal basis linked to the clause; members table; its reports; the decisions it brought; the appointing announcement as a document link. The politics and democracy committee shows each chair named in the sources, with the dates of the announcements and resolutions.

### Meetings `/about/open-data/tusc/meetings`

Index, grouped by session, newest first. Each row: date (both eras in Thai, Gregorian in English), meeting, decisions taken, attendance ("17 of 30"), minutes status ("Adopted 8 January 2026" or "Not yet adopted").

Above the list, one ONS figure: "Attendance fell from 31 at the first meeting to 17 at the last", a column chart of members present at each of the 7 meetings with the 30-seat line marked, then its table and CSV.

One meeting page, in this order:

1. Metadata list: date and time, place (room 303, Student Activity Building, and online), chair, session type with a Details element explaining extraordinary sessions, attendance, quorum.
2. Decisions at this meeting: a table, one row per resolution: item, decision, for, against, abstain, outcome (StatusTag). Totals only, because that is all the minutes record.
3. Agenda: the council's 8 standing sections as an ordered list with anchors, each item linking down to its place in the minutes.
4. Minutes in full, as HTML: attendance tables (present, on leave, absent, by party), every item with its debate and the resolution in bold, the signatories at the end. In-page table of contents (ONS) by agenda item.
5. Documents: the signed minutes PDF, the agenda PDF, the papers, and the superseded draft where one exists, each with type, size and pages.
6. Previous and next meeting.


### Decisions register `/about/open-data/tusc/decisions`

All 38 resolutions, filterable with a GET form (works without JavaScript; existing `QUERY_ROUTES` pattern): topic (appointments, budget, rules, committees, other), outcome, meeting. Each row: the decision in one sentence, outcome tag, vote totals, link to the item in the minutes. Server-side paging (ONS pagination, "Page 1 of 2"), with "Download all decisions (CSV)" above the list.

### Rules `/about/open-data/tusc/rules`

Grouped by what the rule is about: how the council works; elections; money; activities and welfare; university rules the council works under. Each row: title, issuer, date, status tag ("In force", "Replaced").

One rule page:

1. Title (Thai, then English), metadata list: issued by, date, made under (link to the empowering clause), status, replaces.
2. "What this means for you": 3 to 8 plain points, each ending with a link to its clause.
3. Full Thai text with an anchor on every clause and a table of contents by chapter. In English the plain points are in English and the full text stays Thai, with a note that the Thai is the legal text. The operation regulation 2569 also has the council's English translation as a second full text.
4. Original PDF.

### Budget `/about/open-data/tusc/budget/2569`

An ONS statistical bulletin for one year.

1. Title "Student activity budget, Tha Prachan: fiscal year 2569 (2026)", summary, metadata (published by the budget monitoring committee, release date taken from the minutes of 19 March 2026, next release "To be announced", contact).
2. Key figures: total 1,988,223.24 baht; change on FY 2568 up 17,623.74 baht (0.9%); Student Union share 58.9%.
3. Main points: for example "Excluding a new 200,000 baht line for the Student Affairs Division, spending was 182,376.26 baht (9.3%) lower than in FY 2568."
4. "How to use these figures": what the figures can be used for.
5. Figures, each with a number, a title that states the finding, a subtitle (measure, body, period), the chart, a source line, footnotes in Details, the table, and "Download this data" (CSV with size):
   - Figure 1: budget by organisation, horizontal bar, sorted by value.
   - Figure 2: budget by expense category, horizontal bar, sorted, the 8 largest plus "Other".
   - Figure 3: change from FY 2568 to FY 2569 by organisation, paired bars (2 series), bodies with no FY 2569 line shown as "[not listed]".
   - Figure 4: Student Union budget by project, horizontal bar.
   - Tables only (no chart) for each club and the council, because they have 1 to 4 lines.
6. Data sources and quality, glossary (fiscal year, organisation types, expense categories), related links (the audit report, the minutes that approved the budget), cite this.

Pie charts from the source are not reproduced; ONS limits pies to 3 to 6 parts that sum to 100%, and these break that.

### Reports `/about/open-data/tusc/reports/[slug]`

ONS article structure: summary, main points, sections, recommendations table (recommendation, addressed to, urgency, status; status "No response recorded" until there is one), data, related links, cite this. Published in full, as the committee wrote them.

- Budget monitoring and audit FY 2569: 7 project sections, cross-project findings, 6 recommendations.
- Canteen ad hoc committee: findings, recommendations split into urgent and long term, and Figure 1 "Seating was the most reported canteen problem", a horizontal bar of the survey counts (seating 150, pigeons 120, cutlery 40, toilets 35, bins 6, other 2). Linked from `/eat`.

### Funds `/about/open-data/tusc/funds`

- What the list is, in two sentences: the 269 university funds, and the 8 fund regulations the council keeps copies of.
- Key figures: 269 funds; 119 endowment (only the income can be spent); 150 that can be spent.
- The 8 regulated funds as a table: fund, who it is for (students, staff, the university), whether students sit on its committee, regulation, date. Links to each regulation in full.
- The full list as a table with server-side paging (25 a page), a filter by type, and "Download all 269 funds (CSV)".
- "Get help paying for your studies" link to the services page that uses the financial need, accident insurance and graduate funds.

### Documents `/about/open-data/tusc/documents`

A document collection of every source file, grouped as in the Drive folder (so people who know the folder can still find things), each row an ONS document list item: title, type, date, "HTML and PDF, 12 pages". One document page holds the transcription as HTML, a metadata list, the original file, and the Drive folder it came from. The welfare guide and the traffic announcement live here, with a line saying where their content is kept up to date on the site.

### Data `/about/open-data/tusc/data`

ONS dataset pages: title, summary, release date, next release, contact, downloads (`csv (12 KB)`), data dictionary, licence, "Publications that use this data".

| Dataset | Rows | Main columns |
|---|---|---|
| Members and roles | about 80 | person, faculty, party, role, body, from, to, source document and clause |
| Committees | 11 | name, type, parent, remit, legal basis, appointed on, ended on |
| Meetings | 7 | session, meeting, date, place, chair, present, on leave, absent, minutes adopted on |
| Decisions | 38 | meeting, item, decision, type, for, against, abstain, outcome, amount |
| Budget lines FY 2568 and 2569 | 91 | year, organisation type, organisation, project, category, amount, view, source page |
| Recommendations | about 20 | report, recommendation, addressed to, urgency, status, status date |
| University funds | 269 | number, type, code, name |
| Canteen survey | 6 | problem, mentions |

CSV is UTF-8 with a byte order mark (Thai opens correctly in Excel), one header row, ISO dates, numbers without separators, no total rows, missing values as spelled-out bracketed markers ("[not stated]"), never blank, "-" or "NA". The budget CSV holds three overlapping views of the same money; a `view` column says which, and the dictionary says not to add across views.

## Presenting numbers (from ONS, adapted for Thai)

- Tables: caption on every table; first column as row headers (`th scope="row"`); numbers right-aligned with tabular figures and the same decimals down a column; totals in a `tfoot`; source line and numbered footnotes ("[note 1]") under the table; stacked layout on a phone (existing `DataTable`); server-side sort and paging for long lists.
- Charts: static SVG rendered on the server, no JavaScript and no animation. Horizontal bars for categories, sorted by value, "Other" last, axis from zero, values labelled on the bars, one colour plus a highlight, at most 5 colours. Columns for a short series over time. No pie, no dual axis, no dashboard. Title states the finding in 15 words or fewer; subtitle gives measure, body and period; alternative text "A bar chart showing that ..." (100 to 200 characters); the table follows every chart.
- Key figures: 2 or 3 tiles, figure up to 14 characters, label with the period.
- Words and numbers: "up 17,623.74 baht (0.9%) from FY 2568"; "to" for ranges; percentages as "58.9%"; percentage points spelled out; in prose round for the reader ("about 2 million baht") and keep full precision in tables and CSV.
- Thai and English stay in their own conventions: Thai dates in the Buddhist era ("8 มกราคม 2569") and times as "16.30 น."; English dates Gregorian ("8 January 2026") with the Buddhist year given when the document is known by it ("academic year 2568 (2025 to 2026)"); English times as "4:30pm". Money: "1,988,223.24 บาท" and "1,988,223.24 baht". All through `lib/i18n/format.ts`.
- Blank values: "[not stated]" and "[not listed]", explained once per table. Values are never corrected or recomputed.

## What has to be built

| Need | Existing | New |
|---|---|---|
| Content | `lib/content`, `lib/db/schema/content`, `/admin/content` | Migration 0015: documents (with transcription and clause index), people, bodies, memberships, meetings, agenda items, resolutions, budget lines, recommendations, funds. Admin types, editable by an editor with TUSC scope. A one-off importer that reads the transcriptions and CSVs |
| Files | `lib/storage` (public images) | Public `document` profile for PDFs, page count read on upload; the 49 originals mirrored so nothing depends on Drive |
| Components | `DataTable`, `SummaryList`, `Details`, `Accordion`, `Pagination`, `StatusTag`, `InsetText`, `NotificationBanner` | `Figure` (number, title, subtitle, source, footnotes, downloads), `BarChart` and `ColumnChart` (SVG), `KeyFigures`, `DocumentList`, `DownloadList`, `SectionNav`, `TableOfContents`, `RelatedLinks`, `CiteThis`; `DataTable` gains row headers, `tfoot`, source note, footnotes, tabular figures, sort links; `Pagination` gains numbered pages and "Page X of Y" |
| Rich text | `lib/rich-text` | Clause and item anchors; printed list numbering kept |
| Routes | `/about/tusc`, `/about/tusu` | `/about/open-data/**`, CSV route handlers allowed through `proxy.ts`, sitemap and search entries, OG images |

## Order of work

1. Components: `Figure`, `BarChart`, `KeyFigures`, `DocumentList`, `SectionNav`, `TableOfContents`, `DataTable` additions.
2. Documents collection and the importer, so every transcription is on the site with its original file.
3. Landing, TUSC open data page, people, committees.
4. Meetings and the decisions register.
5. Rules.
6. Budget FY 2569 and the two reports.
7. Funds and the data page.
8. Service pages fed from the welfare guide, the fund regulations and the traffic announcement.

## What to ask the council

1. Agendas and papers for extraordinary sessions 1 and 2, and the adopted minutes of 19 March 2026, when the council publishes them.
2. Status of each recommendation in the audit and canteen reports.
3. A team contact (shared address) for each body.

## Publishing standard for the council

- One file per document, named `YYYY-MM-DD_type_short-title` in Latin letters.
- PDFs exported from the word processor, never scanned; sign on a cover page.
- Every report dated and linked to the meeting that received it.
- Budgets as a spreadsheet: one row per line, with a column for requested, approved and spent.
- A dated member list with a change log.
- Agendas and papers published 5 days before a meeting (the 2569 regulation's notice period), minutes within a period the council sets.
