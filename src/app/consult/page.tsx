import Flow from "@/components/consult/Flow";
import SiteHeader from "@/components/SiteHeader";

export const metadata = { title: "Consultation | Chairside" };

export default async function ConsultPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const embedded = (await searchParams).embed === "1";
  return (
    <main className="min-h-screen">
      {!embedded && <SiteHeader />}
      <Flow embedded={embedded} />
    </main>
  );
}
