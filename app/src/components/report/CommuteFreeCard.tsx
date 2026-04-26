// "출퇴근 안 해요" 선택 시 RouteOptions 대체 카드.
// 은퇴·재택·전업주부·학생 등 출근 동선 무관한 분에게 단지 분위기·생활 동선 관점 안내.

import { Coffee } from 'lucide-react';
import type { HouseholdType } from '@/types/profile';

interface Props {
  householdType?: HouseholdType | null;
  apartmentName: string;
}

function pickHook(household: HouseholdType | null | undefined): { line: string; vibe: string } {
  switch (household) {
    case 'retired':
      return {
        line: '두 분의 진짜 동선은 단지 안과 동네예요',
        vibe: '한강·시장·공원·병원까지 도보로 닿는지 한번 답사해보세요. 출퇴근 인파를 피한 평일 낮이 한적해요.',
      };
    case 'single':
      return {
        line: '출근 시간에 묶이지 않으니, 일상 동선이 진짜 출근',
        vibe: '카페·러닝코스·운동·만남 동선이 가까운지 살펴보세요. 1인가구는 동네가 곧 사무실이에요.',
      };
    case 'investor':
      return {
        line: '실거주자 입장에서 동네 매력도를 점검해요',
        vibe: '교통보다 단지 인프라·세대수·전세가율이 시장 신호로 더 강해요.',
      };
    case 'newlywed':
    case 'couple':
      return {
        line: '재택·자율근무라면 동네 자체가 사무실',
        vibe: '카페·산책·점심외출 동선이 단지에서 도보권인지가 출근 시간보다 중요해요.',
      };
    case 'family_kids':
    case 'school_parent':
      return {
        line: '아이 동선·집안일 거점이 곧 일상',
        vibe: '학교·공원·대형마트까지 도보권인지 확인해보세요. 출근 동선보다 자녀·생활 동선이 우선이에요.',
      };
    default:
      return {
        line: '출퇴근 자유. 단지 분위기·동네가 진짜 출근지',
        vibe: '카페·산책·생활편의 동선이 단지에서 가까운지 살펴보세요.',
      };
  }
}

export default function CommuteFreeCard({ householdType, apartmentName }: Props) {
  const { line, vibe } = pickHook(householdType);
  return (
    <div className="rounded-3xl border-2 border-primary/40 bg-primary-soft p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <Coffee className="h-3 w-3" />
          NO RUSH
        </span>
        <span className="text-xs font-semibold text-foreground-sub">출퇴근 안 해요 모드</span>
      </div>
      <div className="mt-3 text-lg font-extrabold leading-snug text-foreground break-keep">
        {line}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-foreground-sub break-keep">
        🌿 <strong className="text-foreground">{apartmentName}</strong> 분석은 출근 경로 대신 동네 자체로 풀어드릴게요. {vibe}
      </p>
    </div>
  );
}
