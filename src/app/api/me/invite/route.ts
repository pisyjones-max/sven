import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { INVITE_MAX_USES, createInvite, currentSession } from '@/lib/account'
import { SITE_URL } from '@/lib/site'

export async function POST() {
  const s = await currentSession()
  if (!s || s.role !== 'owner') return NextResponse.json({ ok: false }, { status: 403 })
  const inv = await createInvite(s.acctId)
  const url = `${SITE_URL}/join/${inv.token}`
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 240, errorCorrectionLevel: 'M' })
  return NextResponse.json({ ok: true, url, svg, expires: inv.exp, max: INVITE_MAX_USES })
}
