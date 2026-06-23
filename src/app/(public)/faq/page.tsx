import { PageIntro } from "@/components/site-shell";

const faqs = [
  ["Where do I find my tracking number?", "TBC tracking numbers are issued when a shipment is created and use the format RR123456789GB."],
  ["Why is my tracking number not found?", "The number may be typed incorrectly, or the shipment may not have been created in the system yet."],
  ["How often is tracking updated?", "Tracking updates appear whenever an admin adds a scan or delivery timeline event."],
  ["What does On Hold mean?", "The parcel may need an address check, processing review, customer instruction, or depot action before moving again."],
  ["Can I change the delivery address?", "Contact support as soon as possible. Address changes depend on parcel status and courier route progress."],
  ["Do you offer business courier services?", "Yes. TBC supports business collections, repeat routes, and custom account pricing."],
];

export default function FaqPage() {
  return (
    <main>
      <PageIntro eyebrow="Help centre" title="FAQ">
        Answers to common delivery, courier, and parcel tracking questions.
      </PageIntro>
      <section className="mx-auto grid max-w-4xl gap-4 px-5 py-12 lg:px-8">
        {faqs.map(([question, answer]) => (
          <details className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={question}>
            <summary className="cursor-pointer text-lg font-black text-[#07152f]">
              {question}
            </summary>
            <p className="mt-3 leading-7 text-[#10213f]">{answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
