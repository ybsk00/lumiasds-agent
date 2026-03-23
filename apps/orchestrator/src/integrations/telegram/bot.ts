// ====================================================================
// Telegram Bot — 보조 알림 + 간단 조회/승인
//
// 역할 (보조 — 없어도 핵심 기능 무관):
//  - 일일 리포트 알림 수신
//  - 이상 탐지 알림 (CPC 급등, 예산 소진 등)
//  - 간단 승인/거부 (인라인 버튼)
//  - 간단 조회 (/상태, /분석)
// ====================================================================

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramConfig {
  botToken: string;
  adminChatId: string;
}

function getConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !adminChatId) return null;
  return { botToken, adminChatId };
}

async function callTelegramAPI(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Telegram API error: ${await res.text()}`);
  }
  return res.json();
}

// ---- 메시지 전송 ----

export async function sendMessage(chatId: string, text: string, options?: {
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: any;
}) {
  const config = getConfig();
  if (!config) return; // 텔레그램 미설정 시 무시

  return callTelegramAPI(config.botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || 'HTML',
    reply_markup: options?.replyMarkup,
  });
}

export async function sendToAdmin(text: string, replyMarkup?: any) {
  const config = getConfig();
  if (!config) return;
  return sendMessage(config.adminChatId, text, { replyMarkup });
}

// ---- 알림 템플릿 ----

export async function sendDailyReport(chatId: string, report: {
  date: string;
  totalCost: number;
  totalConversions: number;
  roas: number;
  summary: string;
  alerts: string[];
}) {
  const alertSection = report.alerts.length > 0
    ? `\n\n⚠️ <b>알림</b>\n${report.alerts.map((a) => `• ${a}`).join('\n')}`
    : '';

  const text = `📊 <b>일일 리포트 — ${report.date}</b>

💰 지출: ₩${report.totalCost.toLocaleString()}
🎯 전환: ${report.totalConversions}건
📈 ROAS: ${report.roas.toFixed(1)}x

${report.summary}${alertSection}`;

  return sendMessage(chatId, text, {
    replyMarkup: {
      inline_keyboard: [
        [{ text: '📊 대시보드', url: process.env.DASHBOARD_URL || 'http://localhost:3000/reports' }],
      ],
    },
  });
}

export async function sendOptimizationAlert(chatId: string, alert: {
  strategyId: string;
  title: string;
  reason: string;
  changes: string[];
}) {
  const text = `🔄 <b>최적화 수정 제안</b>

<b>${alert.title}</b>

📌 사유: ${alert.reason}

변경 사항:
${alert.changes.map((c) => `• ${c}`).join('\n')}

웹 대시보드에서 상세 내용을 확인하고 승인해주세요.`;

  return sendMessage(chatId, text, {
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '✅ 승인', callback_data: `approve_${alert.strategyId}` },
          { text: '❌ 거부', callback_data: `reject_${alert.strategyId}` },
        ],
        [{ text: '📊 상세 보기', url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/approvals` }],
      ],
    },
  });
}

export async function sendCpcSpikeAlert(chatId: string, data: {
  platform: string;
  campaignName: string;
  prevCpc: number;
  currentCpc: number;
  changePercent: number;
}) {
  const text = `⚠️ <b>CPC 급등 감지</b>

플랫폼: ${data.platform}
캠페인: ${data.campaignName}
CPC: ₩${data.prevCpc.toLocaleString()} → ₩${data.currentCpc.toLocaleString()} (+${data.changePercent}%)`;

  return sendMessage(chatId, text, {
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '⏸ 정지', callback_data: `pause_campaign` },
          { text: '📊 상세', url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/campaigns` },
        ],
      ],
    },
  });
}

// ---- Webhook 처리 (Hono 라우터에서 호출) ----

export async function handleWebhook(update: any): Promise<string> {
  // 콜백 쿼리 (인라인 버튼 클릭)
  if (update.callback_query) {
    const callbackData = update.callback_query.data || '';
    const chatId = update.callback_query.message?.chat?.id;

    if (callbackData.startsWith('approve_')) {
      // TODO: 전략 승인 처리
      await sendMessage(chatId, '✅ 승인되었습니다. 웹 대시보드에서 진행 상황을 확인하세요.');
      return 'approved';
    }
    if (callbackData.startsWith('reject_')) {
      await sendMessage(chatId, '❌ 거부되었습니다.');
      return 'rejected';
    }
  }

  // 텍스트 메시지 (간단 명령)
  if (update.message?.text) {
    const text = update.message.text;
    const chatId = update.message.chat.id;

    if (text === '/상태' || text === '/status') {
      await sendMessage(chatId, '📊 현재 상태를 웹 대시보드에서 확인하세요.\n\n' + (process.env.DASHBOARD_URL || 'http://localhost:3000'));
      return 'status_sent';
    }

    if (text === '/help' || text === '/도움') {
      await sendMessage(chatId, `🤖 <b>LumiAds Bot</b>

사용 가능한 명령:
/상태 — 현재 캠페인 상태
/도움 — 도움말

이 봇은 알림 수신 + 간단 승인용입니다.
상세 관리는 웹 대시보드를 이용하세요.`);
      return 'help_sent';
    }
  }

  return 'no_action';
}
