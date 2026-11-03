import { createFileRoute } from "@tanstack/react-router";

import { Today } from "@/components/today";
import { placeholderShellData } from "@/lib/shell-data";

export const Route = createFileRoute("/w/$slug/")({
  component: TodayPage,
  staticData: { screen: "dashboard" },
});

function TodayPage() {
  const { slug } = Route.useParams();
  return <Today memberRole={placeholderShellData(slug).role} />;
}
