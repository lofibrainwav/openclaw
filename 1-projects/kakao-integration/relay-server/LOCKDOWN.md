# BB-AI Kakao Relay Server — LOCKED CONFIG
# ⚠️ 이 파일은 VM ~/apps/kakao-relay/ 에도 존재합니다
# 변경 시 VM에도 동기화 필요

## 아키텍처
```
카카오톡 → 카카오 챗봇 스킬 (BB-AI 응답)
  → https://kakao.brnestrm.com/kakao/skill
  → Cloudflare Tunnel (systemd, auto-restart)
  → GCP VM localhost:3000 (Docker, --network host)
  → Vertex AI gemini-2.0-flash-001 (GCE Service Account)
  → 한국어 응답
```

## 서비스 상태 (2026-02-23 잠금)

| 서비스 | 상태 | 재시작 방식 |
|--------|------|-------------|
| kakao-relay (Docker) | ✅ running | `--restart unless-stopped` |
| cloudflared | ✅ enabled | systemd (auto) |
| openclaw-gateway | ✅ running | systemd (auto) |
| Telegram (MAX) | ✅ polling | OpenClaw 자동관리 |

## GCP 정보
- **인스턴스**: openclaw-instance (us-central1-a)
- **프로젝트**: afo-kingdom
- **Scope**: cloud-platform
- **서비스 계정**: 776695910723-compute@developer.gserviceaccount.com

## 인증 요약
| 대상 | 방식 | API Key 사용 |
|------|------|-------------|
| 카카오 릴레이 | GCE Service Account (Vertex AI) | ❌ 불필요 |
| 텔레그램 MAX | Antigravity OAuth (bigbananamusic@gmail.com) | ❌ 불필요 |

## URL 목록
- Health: https://kakao.brnestrm.com/health
- Skill: https://kakao.brnestrm.com/kakao/skill
- 카카오 관리자: https://chatbot.kakao.com

## VM 재배포 명령
```bash
gcloud compute ssh openclaw-instance --zone=us-central1-a --project=afo-kingdom
cd ~/apps/kakao-relay && bash run.sh
```
