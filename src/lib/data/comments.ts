import { logQueryError, type DB } from "./types";

export type Comment = {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  replies?: Comment[];
};

export async function getLessonComments(db: DB, lessonId: string): Promise<Comment[]> {
  const { data, error } = await db
    .from("comments")
    .select(`
      id, lesson_id, user_id, content, parent_id, created_at
    `)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  logQueryError("getLessonComments", error);
  if (!data || data.length === 0) return [];

  const userIds = Array.from(new Set(data.map((row: any) => row.user_id)));
  
  const { data: profilesData } = await db
    .from("profiles")
    .select("id, name, avatar_url")
    .in("id", userIds);
    
  const profilesMap = new Map(
    (profilesData || []).map((p: any) => [p.id, p])
  );

  const comments = data.map((row: any) => {
    const profile = profilesMap.get(row.user_id) || {};
    return {
      id: row.id,
      lessonId: row.lesson_id,
      userId: row.user_id,
      content: row.content,
      parentId: row.parent_id,
      createdAt: row.created_at,
      user: {
        name: profile.name || "Usuário",
        avatarUrl: profile.avatar_url,
      },
    };
  });

  const rootComments = comments.filter((c: any) => !c.parentId);
  const replies = comments.filter((c: any) => c.parentId);

  rootComments.forEach((c: any) => {
    c.replies = replies.filter((r: any) => r.parentId === c.id);
  });

  return rootComments;
}
