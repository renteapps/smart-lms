import { PageSkeleton } from "@/components/ui/editorial";

export default function Loading() {
  return <PageSkeleton stats={4} label="Carregando" />;
}
