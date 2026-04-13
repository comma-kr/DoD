import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { saveProfile } from '@/lib/profile';
import {
  isValidHouseholdType,
  isValidPriority,
  isValidCommuteArea,
} from '@/types/profile';

const schema = z.object({
  householdType: z.string().refine(isValidHouseholdType, 'INVALID_HOUSEHOLD'),
  priorities: z
    .array(z.string().refine(isValidPriority, 'INVALID_PRIORITY'))
    .min(1)
    .max(4),
  commuteArea: z
    .string()
    .refine(isValidCommuteArea, 'INVALID_COMMUTE')
    .optional(),
  commuteAreaCustom: z.string().max(40).optional(),
  workplaceAddress: z.string().max(100).optional(),
  transportMode: z.enum(['car', 'transit', 'mixed']).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_BODY', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await saveProfile({
    phone: session.phone,
    ...(parsed.data as {
      householdType: Parameters<typeof saveProfile>[0]['householdType'];
      priorities: Parameters<typeof saveProfile>[0]['priorities'];
      commuteArea?: Parameters<typeof saveProfile>[0]['commuteArea'];
      commuteAreaCustom?: string;
      workplaceAddress?: string;
      transportMode?: Parameters<typeof saveProfile>[0]['transportMode'];
    }),
  });

  if (!result.ok) {
    if (result.error === 'TABLE_MISSING') {
      return NextResponse.json(
        {
          error: 'TABLE_MISSING',
          message:
            'user_profiles 테이블이 아직 적용되지 않았어요. Supabase SQL Editor에서 0003_user_profiles.sql을 실행해주세요.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'SAVE_FAILED', message: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}
