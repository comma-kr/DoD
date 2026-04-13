'use client';

import { useRouter } from 'next/navigation';
import SearchBar, { type SearchResult } from './SearchBar';

export default function LandingSearch() {
  const router = useRouter();

  function handleSelect(apt: SearchResult) {
    router.push(`/analyze?apt=${encodeURIComponent(apt.id)}`);
  }

  return <SearchBar onSelect={handleSelect} placeholder="단지명을 입력해보세요 (예: 헬리오시티)" />;
}
