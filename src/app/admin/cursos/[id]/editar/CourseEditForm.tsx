"use client";

import { CourseForm } from "@/components/admin/CourseForm";
import type { Course } from "@/types/course";
import type { CategoryRow, TagRow } from "@/app/actions/admin/categories";

export function CourseEditForm({ 
  course,
  categories,
  tagsOptions
}: { 
  course: Course;
  categories: CategoryRow[];
  tagsOptions: TagRow[];
}) {
  return <CourseForm course={course} categories={categories} tagsOptions={tagsOptions} />;
}
