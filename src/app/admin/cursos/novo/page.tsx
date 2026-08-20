import { CourseForm } from "@/components/admin/CourseForm";
import { getCategories, getTags } from "@/app/actions/admin/categories";

export default async function AdminCursoNovoPage() {
  const categories = await getCategories();
  const tags = await getTags();
  
  return <CourseForm categories={categories} tagsOptions={tags} />;
}
