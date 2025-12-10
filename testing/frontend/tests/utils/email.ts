import { APIRequestContext } from '@playwright/test'

const mailApiBase = process.env.PLAYWRIGHT_MAIL_API || ''

export type MailSearchParams = {
  to?: string
  subject?: string
  containing?: string
}

export type MailhogMessage = {
  ID: string
  Content: {
    Headers: Record<string, string[]>
    Body: string
  }
}

export async function findMailhogMessage(
  api: APIRequestContext,
  { to, subject, containing }: MailSearchParams
): Promise<MailhogMessage | null> {
  if (!mailApiBase) return null
  try {
    const queryParts = []
    if (to) queryParts.push(`to:${to}`)
    if (subject) queryParts.push(`subject:${subject}`)
    if (containing) queryParts.push(containing)
    const query = queryParts.join(' ')
    const res = await api.get(`${mailApiBase}/v2/search`, {
      params: { kind: 'containing', query },
    })
    if (!res.ok()) return null
    const body = (await res.json()) as { items?: MailhogMessage[] }
    return body.items?.[0] || null
  } catch {
    return null
  }
}

export function extractOtpFromBody(body: string) {
  const match = body.match(/(\d{4,6})/)
  return match ? match[1] : null
}

export async function getLatestOtp(api: APIRequestContext, to: string) {
  const message = await findMailhogMessage(api, { to, containing: 'OTP' })
  if (!message) return null
  const body = message.Content?.Body || ''
  return extractOtpFromBody(body)
}
