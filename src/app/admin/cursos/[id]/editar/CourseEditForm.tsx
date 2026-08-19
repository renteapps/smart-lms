"use client";

import { CourseForm } from "@/components/admin/CourseForm";
import type { Course } from "@/types/course";

export function CourseEditForm({ course }: { course: Course }) {
  return <CourseForm course={course} />;
}
