import { redirect } from "next/navigation";

// Ver nota de segurança em src/app/analises/page.tsx.
export default function AnaliseCursoRedirect() {
  redirect("/admin/analises/cursos");
}
