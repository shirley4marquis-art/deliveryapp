export type ServiceData = {
  slug: string;
  name: string;
  deliveryService: string;
  price: string;
  timing: string;
  description: string;
  features: string[];
  heroImage: string;
  gallery: string[];
  estimatedDays: number;
};

export const SERVICES: ServiceData[] = [
  {
    slug: "standard",
    name: "Standard Parcel Delivery",
    deliveryService: "Standard delivery",
    price: "From £4.95",
    timing: "2–4 working days",
    description:
      "Cost-effective parcel delivery for everyday household and retail shipments across the UK. We handle your parcels with care from collection to doorstep delivery.",
    features: [
      "Full parcel tracking",
      "Depot scan updates",
      "Email delivery notifications",
      "Email support",
      "Signature on delivery available",
    ],
    heroImage: "/images/royal-runs/customer-parcel.jpg",
    gallery: [
      "/images/royal-runs/van-parcel-stack.jpg",
      "/images/royal-runs/courier-parcels-van.jpg",
    ],
    estimatedDays: 3,
  },
  {
    slug: "next-day",
    name: "Next-Day Delivery",
    deliveryService: "Next-day delivery",
    price: "From £8.95",
    timing: "Next working day",
    description:
      "Priority next-day courier service with real-time scan updates and reliable UK-wide coverage. Perfect for time-sensitive parcels and business shipments.",
    features: [
      "Priority routing",
      "ETA visibility",
      "Proof of delivery",
      "Real-time tracking",
      "Next working day guarantee",
    ],
    heroImage: "/images/royal-runs/van-delivery-stop.jpg",
    gallery: [
      "/images/royal-runs/courier-van-loading.jpg",
      "/images/royal-runs/van-parcel-stack.jpg",
    ],
    estimatedDays: 1,
  },
  {
    slug: "same-day",
    name: "Same-Day Delivery",
    deliveryService: "Same-day delivery",
    price: "Quoted per job",
    timing: "Same day",
    description:
      "Dedicated same-day courier for urgent local and regional consignments. Your parcel collected and delivered today — no waiting, no delays.",
    features: [
      "Dedicated courier",
      "Urgent same-day collection",
      "Direct point-to-point delivery",
      "Live tracking updates",
      "Flexible pick-up times",
    ],
    heroImage: "/images/royal-runs/courier-parcels-van.jpg",
    gallery: [
      "/images/royal-runs/van-delivery-stop.jpg",
      "/images/royal-runs/courier-van-loading.jpg",
    ],
    estimatedDays: 0,
  },
  {
    slug: "business",
    name: "Business Courier Services",
    deliveryService: "Business courier services",
    price: "Custom rates",
    timing: "Flexible scheduling",
    description:
      "Repeat collections, office logistics, and managed courier support for growing teams. Tailored solutions for businesses of all sizes across the UK.",
    features: [
      "Repeat collection scheduling",
      "Dedicated account support",
      "Volume discounts available",
      "Managed logistics support",
      "Priority customer service",
    ],
    heroImage: "/images/royal-runs/courier-van-loading.jpg",
    gallery: [
      "/images/royal-runs/courier-parcels-van.jpg",
      "/images/royal-runs/van-delivery-stop.jpg",
    ],
    estimatedDays: 2,
  },
  {
    slug: "secure-documents",
    name: "Secure Document Delivery",
    deliveryService: "Secure document delivery",
    price: "From £6.95",
    timing: "1–2 working days",
    description:
      "Careful handling for contracts, certificates, legal files, and sensitive paperwork. Secure and confidential document courier service across the UK.",
    features: [
      "Discreet handling",
      "Signature required on delivery",
      "Tamper-evident packaging option",
      "Full chain of custody tracking",
      "GDPR-compliant service",
    ],
    heroImage: "/images/royal-runs/uk-postbox.jpg",
    gallery: [
      "/images/royal-runs/customer-parcel.jpg",
      "/images/royal-runs/van-parcel-stack.jpg",
    ],
    estimatedDays: 2,
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getAllServices(): ServiceData[] {
  return SERVICES;
}
