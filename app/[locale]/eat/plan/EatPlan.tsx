import { PlanPage } from "@/components/domain/canteen/pages/Plan";
import { LivePlan } from "@/components/domain/canteen/pages/PlanLive";
import { PreloadCanteenData } from "@/components/domain/canteen/pages/Preload";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { newSeed } from "@/lib/canteen/random";
import type { Locale } from "@/lib/i18n/config";
import { getCanteenData } from "@/lib/content";

export async function EatPlan({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const data = await getCanteenData();
  const now = new Date();

  return (
    <Container className="pb-8 pt-2">
      <PreloadCanteenData />
      <QueryBoundary filtered={filtered} fallback={<PlanPage locale={locale} data={data} query={{}} now={now} freshSeed="" />}>
        {filtered ? <LivePlan locale={locale} data={data} server={{ now: now.toISOString(), seed: newSeed() }} /> : <LivePlan locale={locale} />}
      </QueryBoundary>
    </Container>
  );
}
