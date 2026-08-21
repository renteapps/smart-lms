import { describe, it, expect, vi } from 'vitest';
import { getCertificateByHash, getStudentCertificates } from './certificates';
import type { DB } from './types';

describe('certificates data helper', () => {
  it('getCertificateByHash mapeia e retorna userId, studentName, curso e horas', async () => {
    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'certificates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'cert-1',
                user_id: 'user-123',
                course_id: 'course-456',
                issue_date: '2026-08-20T12:00:00Z',
                validation_hash: 'hash-abc-123',
                courses: {
                  title: 'Curso de React Avançado',
                  duration: '10 horas',
                  instructor_names: ['Instrutor Exemplo'],
                },
                profiles: {
                  full_name: 'Maria Silva',
                },
              },
              error: null,
            }),
          };
        }
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'm1', lessons: [{ duration_in_minutes: 60 }, { duration_in_minutes: 60 }] },
              ],
              error: null,
            }),
          };
        }
        return {};
      }),
    } as unknown as DB;

    const result = await getCertificateByHash(mockDb, 'hash-abc-123');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('cert-1');
    expect(result?.userId).toBe('user-123');
    expect(result?.studentName).toBe('Maria Silva');
    expect(result?.courseTitle).toBe('Curso de React Avançado');
    expect(result?.courseDurationHours).toBe(2);
    expect(result?.validationHash).toBe('hash-abc-123');
    expect(result?.instructorNames).toEqual(['Instrutor Exemplo']);
  });

  it('getStudentCertificates mapeia lista de certificados', async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cert-1',
              course_id: 'course-1',
              issue_date: '2026-08-20T12:00:00Z',
              validation_hash: 'hash-1',
              pdf_url: null,
              courses: {
                title: 'Curso 1',
                category: 'Dev',
                cover_url: 'https://example.com/cover.png',
              },
            },
          ],
          error: null,
        }),
      }),
    } as unknown as DB;

    const result = await getStudentCertificates(mockDb, 'user-123');

    expect(result).toHaveLength(1);
    expect(result[0].courseTitle).toBe('Curso 1');
    expect(result[0].validationHash).toBe('hash-1');
  });
});
