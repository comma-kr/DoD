// NCP SENS (Naver Cloud Simple & Easy Notification Service) SMS 발송
// HMAC-SHA256 서명을 사용한 인증 방식

import crypto from 'crypto';

interface SendSmsParams {
  to: string;
  content: string;
}

function makeSignature(timestamp: string, method: string, url: string): string {
  const secretKey = process.env.NCP_SENS_SECRET_KEY!;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY!;

  const space = ' ';
  const newLine = '\n';

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(method);
  hmac.update(space);
  hmac.update(url);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);

  return hmac.digest('base64');
}

export async function sendSms({ to, content }: SendSmsParams): Promise<void> {
  const serviceId = process.env.NCP_SENS_SERVICE_ID!;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY!;
  const fromNumber = process.env.NCP_SENS_FROM_NUMBER!;

  const timestamp = Date.now().toString();
  const method = 'POST';
  const apiUrl = `/sms/v2/services/${serviceId}/messages`;
  const signature = makeSignature(timestamp, method, apiUrl);

  const response = await fetch(`https://sens.apigw.ntruss.com${apiUrl}`, {
    method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-ncp-apigw-timestamp': timestamp,
      'x-ncp-iam-access-key': accessKey,
      'x-ncp-apigw-signature-v2': signature,
    },
    body: JSON.stringify({
      type: 'SMS',
      from: fromNumber,
      content,
      messages: [{ to, content }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SENS 발송 실패: ${response.status} ${text}`);
  }
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatOtpMessage(code: string): string {
  return `[입지990] 인증번호 ${code} (3분 이내 입력)`;
}
