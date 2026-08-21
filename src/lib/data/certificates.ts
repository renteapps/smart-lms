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

export type CourseCertificateInfo = {
  id: string;
  validationHash: string;
};

export async function getCourseCertificate(
  db: DB,
  userId: string,
  courseId: string,
): Promise<CourseCertificateInfo | null> {
  const { data, error } = await db
    .from('certificates')
    .select('id, validation_hash')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  logQueryError('getCourseCertificate', error);
  if (!data) return null;
  return {
    id: data.id,
    validationHash: data.validation_hash,
  };
}

export type ValidatedCertificate = {
  id: string;
  studentName: string;
  courseTitle: string;
  courseDurationHours: number;
  instructorNames: string[];
  issueDate: string;
  validationHash: string;
};

export async function getCertificateByHash(
  db: DB,
  hash: string,
): Promise<ValidatedCertificate | null> {
  const { data, error } = await db
    .from('certificates')
    .select(
      'id, course_id, issue_date, validation_hash, courses!inner(title, duration, instructor_names), profiles:user_id(full_name)',
    )
    .eq('validation_hash', hash)
    .single();

  logQueryError('getCertificateByHash', error);

  if (!data) return null;

  const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  // Calcular duração em horas (arredondado para cima)
  let totalHours = 1; // Padrão

  const { data: modules } = await db
    .from('modules')
    .select('id, lessons(duration_in_minutes)')
    .eq('course_id', data.course_id);

  if (modules && modules.length > 0) {
    let totalMinutes = 0;
    modules.forEach((mod: Row) => {
      if (mod.lessons && Array.isArray(mod.lessons)) {
        mod.lessons.forEach((lesson: Row) => {
          totalMinutes += lesson.duration_in_minutes || 0;
        });
      }
    });
    if (totalMinutes > 0) {
      totalHours = Math.ceil(totalMinutes / 60);
    } else {
      // Tenta usar o duration string se tiver
      if (course?.duration) {
        const parsed = parseInt(course.duration.replace(/\D/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) totalHours = parsed;
      }
    }
  }

  return {
    id: data.id,
    studentName: profile?.full_name ?? 'Estudante',
    courseTitle: course?.title ?? 'Curso',
    courseDurationHours: totalHours,
    instructorNames: course?.instructor_names ?? [],
    issueDate: data.issue_date,
    validationHash: data.validation_hash,
  };
}
