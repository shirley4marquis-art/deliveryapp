import { PageIntro } from "@/components/site-shell";
import { TrackParcel } from "@/components/track-parcel";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialNumber = q ? decodeURIComponent(q).toUpperCase().trim() : "";

  return (
    <main>
      <PageIntro eyebrow="Live parcel tracking" title="Track Parcel">
        Enter your TBC tracking number to see the current status,
        sender city, receiver city, estimated delivery date, and full timeline.
      </PageIntro>
      <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        <TrackParcel initialTrackingNumber={initialNumber} />
      </section>
    </main>
  );
}
