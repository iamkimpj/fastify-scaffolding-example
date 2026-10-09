// src/api-contracts/error-code.contract.ts — 에러 코드 목록 (계약)

/**
 * 오류를 구분하는 코드. 봉투의 `errorCode` 에는 여기 선언된 값만 쓴다.
 *
 * `errorMessage` 는 개발자가 읽는 문구고, `errorCode` 는 **화면이 분기할 값**이다.
 * 사용자에게 보일 문구는 화면이 코드로 분기해 정한다.
 *
 * 값을 키와 같게 둔다. 네트워크 탭에 뜬 문자열로 코드를 바로 검색할 수 있다.
 * **쓰는 곳이 없는 코드는 미리 만들지 않는다.** 필요할 때 추가한다.
 */
export const ERROR_CODE = {
  /** 로그인이 필요하다. 토큰이 없거나, 틀렸거나, 만료됐거나, 다른 가드용이다 */
  UNAUTHORIZED: "UNAUTHORIZED",
  /** 요청 값이 스키마에 맞지 않거나, 본문이 깨졌거나, content-type 이 맞지 않다 */
  INVALID_REQUEST: "INVALID_REQUEST",
  /** 그런 경로(또는 메서드)가 없다. "리소스가 없다" 와 구분한다 */
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  /**
   * 그 id 의 예시가 없다. 경로는 맞게 불렀다는 점에서 ROUTE_NOT_FOUND 와 다르다.
   * 도메인 코드 예시: `<대상>_<상태>`
   */
  EXAMPLE_NOT_FOUND: "EXAMPLE_NOT_FOUND",
  /** 예상하지 못한 오류. 자세한 내용은 서버 로그에만 남긴다 */
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
