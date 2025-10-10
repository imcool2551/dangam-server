import axios from 'axios';
import dotenv from 'dotenv'
import * as path from 'node:path';

dotenv.config({ path: path.join(__dirname, '..', '.env') })

// 카카오 앱 설정 (실제 값으로 변경 필요)
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const REDIRECT_URI = 'http://localhost:3000/auth/kakao/callback';

// 서버 URL
const BASE_URL = 'http://localhost:3000';

interface KakaoTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

interface KakaoUserInfo {
  id: number;
  connected_at: string;
  properties: {
    nickname: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account: {
    profile_needs_agreement: boolean;
    profile: {
      nickname: string;
      thumbnail_image_url?: string;
      profile_image_url?: string;
    };
  };
}

interface SignInResponse {
  uid: string;
  displayName: string;
  isNewUser: boolean;
}

async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  try {
    const response = await axios.get<KakaoUserInfo>('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('카카오 사용자 정보 조회 실패:', error);
    throw error;
  }
}

async function signInToMyServer(idToken: string): Promise<SignInResponse> {
  try {
    const response = await axios.post<SignInResponse>(
      `${BASE_URL}/auth/sign-in`,
      {
        ssoType: 'kakao',
        idToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('내 서버 로그인 실패:', error);
    throw error;
  }
}

async function kakaoLoginFlow(authorizationCode: string) {
  try {
    console.log('🔐 카카오 토큰 요청 중...');
    
    // 1. 인가 코드로 액세스 토큰 받기
    const tokenResponse = await axios.post<KakaoTokenResponse>(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: REDIRECT_URI,
        code: authorizationCode,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    console.log('✅ 카카오 토큰 획득 성공');
    const { access_token, id_token } = tokenResponse.data;

    // 2. 액세스 토큰으로 사용자 정보 조회
    console.log('👤 카카오 사용자 정보 조회 중...');
    const userInfo = await getKakaoUserInfo(access_token);
    
    console.log('✅ 카카오 사용자 정보 조회 성공');
    console.log('사용자 ID:', userInfo.id);
    console.log('닉네임:', userInfo.properties?.nickname);

    // 3. ID 토큰으로 내 서버에 로그인/회원가입
    console.log('🚀 ID 토큰으로 내 서버에 로그인 시도...');
    const signInResult = await signInToMyServer(id_token);

    console.log('✅ 로그인 성공!');
    console.log('결과:', signInResult);

    if (signInResult.isNewUser) {
      console.log('🎉 새로운 사용자가 회원가입되었습니다!');
    } else {
      console.log('👋 기존 사용자가 로그인했습니다!');
    }

    return signInResult;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API 요청 실패');
      console.error('상태 코드:', error.response?.status);
      console.error('에러 메시지:', error.response?.data);
    } else {
      console.error('❌ 예상치 못한 에러:', error);
    }
    throw error;
  }
}

// 카카오 로그인 URL 생성
function getKakaoLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  });

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

// 사용법 안내
console.log('=== 카카오 로그인 테스트 ===');
console.log('1. 먼저 아래 URL로 접속하여 카카오 로그인을 진행하세요:');
console.log(getKakaoLoginUrl());
console.log('');
console.log('2. 로그인 후 리다이렉트된 URL에서 code 파라미터를 복사하세요');
console.log('3. 아래 함수를 호출하세요:');
console.log('   kakaoLoginFlow("복사한_인가_코드")');
console.log('');

// 예시: 인가 코드가 있을 때 실행
const authCode = 'tAXdT4bToy0m1W6F8oTza3U7TTGMYIPJdq-J5vwQI5Ko-mg0zdXGWAAAAAQKDR-XAAABmc422I3Nsk3jZ7dWzg';
kakaoLoginFlow(authCode);

export { kakaoLoginFlow, getKakaoLoginUrl };