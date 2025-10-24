import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PublicApi } from './auth/decorators/role.decorator';

@Controller()
export class AppController {
  @Get('/health')
  getHello(): string {
    return 'health';
  }

  @PublicApi()
  @Get('/invite/:token')
  getInvitePage(@Param('token') token: string, @Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>단감 초대</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 400px;
            width: 100%;
            background: white;
            padding: 40px 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .loading {
            margin: 30px 0;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .fallback {
            display: none;
            margin-top: 30px;
        }
        .fallback.show {
            display: block;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            margin: 10px 0;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
            border: none;
            font-size: 16px;
            width: 100%;
        }
        .btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .btn:active {
            transform: translateY(0);
        }
        .guide {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            font-size: 14px;
            line-height: 1.8;
            text-align: left;
        }
        .guide-title {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
            display: block;
        }
        .guide ol {
            margin-left: 20px;
        }
        .guide li {
            margin: 8px 0;
        }
        .store-links {
            margin-top: 15px;
        }
        .store-btn {
            background: #34c759;
            font-size: 14px;
            padding: 12px 20px;
        }
        .store-btn:hover {
            background: #2da84a;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍊</h1>
        <div class="title">단감</div>
        <p class="subtitle">그룹 초대에 응답하는 중...</p>

        <div class="loading">
            <div class="spinner"></div>
        </div>

        <div class="fallback" id="fallback">
            <p style="margin-bottom: 20px; color: #666;">앱이 열리지 않나요?</p>
            <button class="btn" id="retryBtn">앱에서 열기</button>

            <div class="guide">
                <span class="guide-title">📱 카카오톡에서 보고 계신가요?</span>
                <ol>
                    <li>우측 상단 <strong>⋮</strong> 메뉴 클릭</li>
                    <li><strong>외부 브라우저에서 열기</strong> 선택</li>
                    <li>다시 링크를 클릭하세요</li>
                </ol>
            </div>

            <div class="guide">
                <span class="guide-title">📥 앱이 설치되지 않았나요?</span>
                <div class="store-links">
                    <a href="https://play.google.com/store/apps/details?id=com.dangam.app" class="btn store-btn">
                        Google Play에서 다운로드
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
        const token = '${token}';

        function openApp() {
            // Custom scheme으로 앱 열기 시도
            window.location.href = 'dangam://invite/' + token;
        }

        // 페이지 로드 시 즉시 앱 열기 시도
        openApp();

        // 2초 후에도 페이지에 있으면 fallback 표시
        const fallbackTimer = setTimeout(() => {
            document.getElementById('fallback').classList.add('show');
        }, 2000);

        // 재시도 버튼
        document.getElementById('retryBtn').onclick = () => {
            openApp();
        };

        // 페이지가 숨겨졌다가 다시 보이면 (앱에서 돌아온 경우) fallback 숨김
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 앱이 열렸다고 판단, fallback 타이머 취소
                clearTimeout(fallbackTimer);
            } else if (document.visibilityState === 'visible') {
                // 다시 돌아왔을 때
                document.getElementById('fallback').classList.remove('show');
            }
        });

        // pagehide 이벤트로도 앱 전환 감지
        window.addEventListener('pagehide', () => {
            clearTimeout(fallbackTimer);
        });
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
