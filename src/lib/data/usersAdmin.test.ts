import { describe, expect, it } from "vitest";
import { normalizeAdminUserFilters, mapAdminUserRow } from "./usersAdmin";

describe("usersAdmin data layer", () => {
  describe("normalizeAdminUserFilters", () => {
    it("deve aplicar valores padrão quando os parâmetros estiverem vazios", () => {
      const filters = normalizeAdminUserFilters({});
      expect(filters).toEqual({
        q: "",
        sort: "created_at",
        dir: "desc",
        role: "all",
        status: "all",
        plan: "all",
        course: "all",
        access: "all",
        page: 1,
        pageSize: 20,
      });
    });

    it("deve normalizar sort e dir válidos", () => {
      const filters = normalizeAdminUserFilters({
        sort: "last_access_at",
        dir: "asc",
      });
      expect(filters.sort).toBe("last_access_at");
      expect(filters.dir).toBe("asc");

      const filtersName = normalizeAdminUserFilters({
        sort: "full_name",
        dir: "desc",
      });
      expect(filtersName.sort).toBe("full_name");
      expect(filtersName.dir).toBe("desc");
    });

    it("deve fallback de sort inválido para created_at", () => {
      const filters = normalizeAdminUserFilters({
        sort: "invalid_col" as unknown as string,
        dir: "unknown" as unknown as string,
      });
      expect(filters.sort).toBe("created_at");
      expect(filters.dir).toBe("desc");
    });

    it("deve normalizar filtros de papel, status, plano, curso e acesso", () => {
      const filters = normalizeAdminUserFilters({
        q: "  aluno teste  ",
        role: "student",
        status: "active",
        plan: "with_plan",
        course: "course-123",
        access: "7d",
        page: "3",
        pageSize: "50",
      });

      expect(filters.q).toBe("aluno teste");
      expect(filters.role).toBe("student");
      expect(filters.status).toBe("active");
      expect(filters.plan).toBe("with_plan");
      expect(filters.course).toBe("course-123");
      expect(filters.access).toBe("7d");
      expect(filters.page).toBe(3);
      expect(filters.pageSize).toBe(50);
    });

    it("deve tratar páginas negativas ou inválidas caindo para 1", () => {
      const filters = normalizeAdminUserFilters({
        page: "-5",
        pageSize: "999",
      });
      expect(filters.page).toBe(1);
      expect(filters.pageSize).toBe(20);
    });

    it("deve aceitar arrays vindos de searchParams", () => {
      const filters = normalizeAdminUserFilters({
        q: ["nome_buscado"],
        sort: ["last_access_at"],
        access: ["30d"],
      });
      expect(filters.q).toBe("nome_buscado");
      expect(filters.sort).toBe("last_access_at");
      expect(filters.access).toBe("30d");
    });
  });

  describe("mapAdminUserRow", () => {
    it("deve mapear a linha da view v_admin_users corretamente", () => {
      const row = {
        id: "usr-1",
        full_name: "Fulano de Tal",
        email: "fulano@email.com",
        avatar_url: "https://avatar.url",
        role: "instructor",
        status: "active",
        last_access_at: "2026-09-28T10:00:00Z",
        created_at: "2026-08-01T12:00:00Z",
        active_plan_id: "plan-1",
        active_plan_name: "Plano Anual",
        active_enrollments_count: 3,
        enrolled_course_ids: ["c1", "c2", "c3"],
      };

      const mapped = mapAdminUserRow(row);
      expect(mapped).toEqual({
        id: "usr-1",
        fullName: "Fulano de Tal",
        email: "fulano@email.com",
        avatarUrl: "https://avatar.url",
        role: "instructor",
        status: "active",
        lastAccessAt: "2026-09-28T10:00:00Z",
        createdAt: "2026-08-01T12:00:00Z",
        activePlanId: "plan-1",
        activePlanName: "Plano Anual",
        activeEnrollmentsCount: 3,
        enrolledCourseIds: ["c1", "c2", "c3"],
      });
    });

    it("deve preencher valores default para campos nulos", () => {
      const row = {
        id: "usr-2",
        full_name: null,
        email: null,
        role: null,
        status: null,
        created_at: "2026-08-01T12:00:00Z",
      };

      const mapped = mapAdminUserRow(row);
      expect(mapped.fullName).toBe("Desconhecido");
      expect(mapped.email).toBe("");
      expect(mapped.role).toBe("student");
      expect(mapped.status).toBe("active");
      expect(mapped.activeEnrollmentsCount).toBe(0);
      expect(mapped.enrolledCourseIds).toEqual([]);
      expect(mapped.activePlanName).toBeUndefined();
    });
  });
});
