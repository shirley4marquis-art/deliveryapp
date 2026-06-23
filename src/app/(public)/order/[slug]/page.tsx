import { notFound } from "next/navigation";
import { getAllServices, getServiceBySlug } from "@/lib/services-data";
import { OrderForm } from "./order-form";

export function generateStaticParams() {
  return getAllServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return { title: `Order ${service.name} | TBC` };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return <OrderForm service={service} />;
}
