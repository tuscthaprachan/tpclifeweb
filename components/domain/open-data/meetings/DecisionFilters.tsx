"use client";

import Form from "next/form";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Cluster } from "@/components/ui/Cluster";
import { Select, type SelectOption } from "@/components/ui/Select";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { DecisionRow, MeetingRow } from "@/lib/open-data/read";
import { fillText } from "../fill";
import { TUSC_PATH } from "../sections";
import { DECISION_OUTCOMES, DECISION_TOPICS, meetingLabel, outcomeLabel, topicLabel } from "./meetings";
import { meetingOptions, type DecisionQuery } from "./decision-query";

interface DecisionFiltersProps {
  locale: Locale;
  decisions: DecisionRow[];
  meetings: MeetingRow[];
  value: DecisionQuery;
  hasActiveFilters: boolean;
  labelledBy: string;
}

function count(decisions: readonly DecisionRow[], pick: (decision: DecisionRow) => string, value: string): number {
  return decisions.filter((decision) => pick(decision) === value).length;
}

/**
 * A real `<form method="get">` with three selects and a submit button, so the filters work with JavaScript off.
 * The script only submits the form when a select changes.
 */
export function DecisionFilters({ locale, decisions, meetings, value, hasActiveFilters, labelledBy }: DecisionFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const total = decisions.length;
  const option = (label: string, n: number) => fillText(UI.odDcOption[locale], { label, n });

  const topicOptions: SelectOption[] = [
    { value: "", label: fillText(UI.odDcAllTopics[locale], { n: total }) },
    ...DECISION_TOPICS.map((topic) => ({ value: topic, label: option(topicLabel(topic, locale), count(decisions, (d) => d.topic, topic)) })),
  ];
  const outcomeOptions: SelectOption[] = [
    { value: "", label: fillText(UI.odDcAllOutcomes[locale], { n: total }) },
    ...DECISION_OUTCOMES.map((outcome) => ({ value: outcome, label: option(outcomeLabel(outcome, locale), count(decisions, (d) => d.outcome, outcome)) })),
  ];
  const meetingSelectOptions: SelectOption[] = [
    { value: "", label: fillText(UI.odDcAllMeetings[locale], { n: total }) },
    ...meetingOptions(meetings).map((meeting) => ({
      value: meeting.slug,
      label: fillText(UI.odDcMeetingOption[locale], {
        meeting: meetingLabel(meeting, locale),
        date: formatDate(meeting.meetingDate, locale),
        n: count(decisions, (d) => d.meetingSlug, meeting.slug),
      }),
    })),
  ];

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  const action = localePath(locale, `${TUSC_PATH}/decisions`);

  return (
    <Form ref={formRef} action={action} aria-labelledby={labelledBy} key={`${value.topic}|${value.outcome}|${value.meeting}`}>
      <Cluster space={4} align="end">
        <Select id="od-filter-topic" name="topic" label={UI.odDcTopic[locale]} options={topicOptions} defaultValue={value.topic} onChange={submitOnChange} />
        <Select id="od-filter-outcome" name="outcome" label={UI.odDcOutcome[locale]} options={outcomeOptions} defaultValue={value.outcome} onChange={submitOnChange} />
        <Select id="od-filter-meeting" name="meeting" label={UI.odDcMeeting[locale]} options={meetingSelectOptions} defaultValue={value.meeting} onChange={submitOnChange} />
        <Button type="submit">{UI.applyFilters[locale]}</Button>
        {hasActiveFilters ? (
          <Button href={action} variant="quiet">
            {UI.clearFilters[locale]}
          </Button>
        ) : null}
      </Cluster>
    </Form>
  );
}
