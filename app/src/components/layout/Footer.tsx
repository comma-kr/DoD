// 빌드타임 상수로 박제 — 새해 자정에 SSR/hydration mismatch 방지.
// 모듈 로드 시 1회 평가, 빌드된 server/client 번들에 같은 값.
const COPYRIGHT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10 text-xs text-foreground-sub">
        <p className="font-semibold text-foreground">칠래말래?</p>
        <p className="mt-2 leading-relaxed">
          본 서비스가 제공하는 정보는 공공데이터(국토교통부 실거래가, 학교알리미
          등)를 기반으로 한 참고용 정보이며, 부동산 투자 자문이 아닙니다. 판단의
          책임은 이용자에게 있습니다.
        </p>
        <p className="mt-4">© {COPYRIGHT_YEAR} 칠래말래?</p>
      </div>
    </footer>
  );
}
