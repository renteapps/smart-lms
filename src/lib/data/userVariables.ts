import {
  nativeUserVariables,
  type OnboardingVariableDefinition,
  type UserVariableMap,
} from '@/lib/userVariables';
import { logQueryError, type DB, type Row } from './types';

export async function getOnboardingVariableDefinitions(
  db: DB,
  options: { activeOnly?: boolean } = {},
): Promise<OnboardingVariableDefinition[]> {
  let query = db
    .from('onboarding_variable_definitions')
    .select('variable_key, question_id, question_text, question_type, active, published_version')
    .order('variable_key', { ascending: true });

  if (options.activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  logQueryError('getOnboardingVariableDefinitions', error);

  return (data ?? []).flatMap((row: Row) => {
    if (!row.variable_key || !row.question_id || !row.question_text) return [];
    return [{
      key: row.variable_key,
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      active: Boolean(row.active),
      publishedVersion: Number(row.published_version) || 0,
    } as OnboardingVariableDefinition];
  });
}

export async function getUsersTemplateVariables(
  db: DB,
  userIds: string[],
): Promise<Map<string, UserVariableMap>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, UserVariableMap>();
  if (!ids.length) return result;

  const [{ data: profiles, error: profileError }, { data: answers, error: answerError }] = await Promise.all([
    db.from('profiles').select('id, full_name, email').in('id', ids),
    db
      .from('student_onboarding_answers')
      .select('user_id, variable_key, answer')
      .in('user_id', ids)
      .not('variable_key', 'is', null),
  ]);

  logQueryError('getUsersTemplateVariables:profiles', profileError);
  logQueryError('getUsersTemplateVariables:answers', answerError);

  ids.forEach((userId) => {
    result.set(userId, { 'contact.id': userId });
  });

  (profiles ?? []).forEach((row: Row) => {
    result.set(row.id, {
      ...result.get(row.id),
      ...nativeUserVariables({ fullName: row.full_name, email: row.email }),
      'contact.id': row.id,
    });
  });

  (answers ?? []).forEach((row: Row) => {
    if (typeof row.user_id !== 'string' || typeof row.variable_key !== 'string' || typeof row.answer !== 'string') return;
    const current = result.get(row.user_id) ?? { 'contact.id': row.user_id };
    current[row.variable_key] = row.answer;
    result.set(row.user_id, current);
  });

  return result;
}

export async function getUserTemplateVariables(db: DB, userId: string): Promise<UserVariableMap> {
  const variables = await getUsersTemplateVariables(db, [userId]);
  return variables.get(userId) ?? { 'contact.id': userId };
}

