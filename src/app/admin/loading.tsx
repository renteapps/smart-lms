import { PageSkeleton } from "@/components/ui/editorial";

export default function AdminLoading() {
  return <PageSkeleton stats={4} label="Carregando área administrativa" />;
}
