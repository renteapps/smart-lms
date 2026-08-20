import { logQueryError, type DB, type Row } from './types';

export type StudentCertificate = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCategory: string;
  courseCover: string | null;
  issueDate: string;
  validationHash: string;
  pdfUrl: string | null;
};

export async function getStudentCertificates(
  db: DB,
  userId: string,
): Promise<StudentCertificate[]> {
  const { data, error } = await db
    .from('certificates')
    .select(
      'id, course_id, issue_date, validation_hash, pdf_url, courses!inner(title, category, cover_url)',
    )
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });

  logQueryError('getStudentCertificates', error);

  return (data ?? []).map((row: Row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    return {
      id: row.id,
      courseId: row.course_id,
      courseTitle: course?.title ?? 'Curso',
      courseCategory: course?.category ?? 'Geral',
      courseCover: course?.cover_url ?? null,
      issueDate: row.issue_date,
      validationHash: row.validation_hash,
      pdfUrl: row.pdf_url ?? null,
    };
  });
}
