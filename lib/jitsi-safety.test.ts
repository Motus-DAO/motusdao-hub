import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { decideOfficeRoomAccess } from './jitsi-policies'
import {
  buildJitsiUrl,
  buildOfficeJitsiUrl,
  buildOpenJitsiUrl,
  buildQuickJitsiUrl,
  canOpenJitsiMeeting,
  meetingHostForRoom,
  meetingSecretKindForRoom,
  refuseGuestToken,
  resolveVideochatRoom,
  therapySessionExternalUrl,
  THERAPY_JITSI_HOST,
  OPEN_JITSI_HOST,
  buildNativeJitsiMeetingUrl,
} from './jitsi'
import { readJitsiSigningKey, signJitsiAccessToken, signJitsiGuestToken } from './jitsi-token'

const ENV_KEYS = [
  'NEXT_PUBLIC_JITSI_DOMAIN',
  'NEXT_PUBLIC_JITSI_OFFICE_PREFIX',
  'NEXT_PUBLIC_JITSI_ROOM_PREFIX',
  'NEXT_PUBLIC_JITSI_OPEN_PREFIX',
  'NEXT_PUBLIC_JITSI_QUICK_PREFIX',
  'NEXT_PUBLIC_JITSI_METAVERSE_PREFIX',
  'NEXT_PUBLIC_JITSI_QUICK_ROOMS',
  'JITSI_APP_ID',
  'JITSI_APP_SECRET',
  'JITSI_OPEN_APP_ID',
  'JITSI_OPEN_APP_SECRET',
] as const

const snapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function useDefaultPrefixes() {
  process.env.NEXT_PUBLIC_JITSI_OFFICE_PREFIX = 'motusdao-office-'
  process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX = 'motusdao-sess-'
  process.env.NEXT_PUBLIC_JITSI_OPEN_PREFIX = 'motusdao-open-'
  process.env.NEXT_PUBLIC_JITSI_QUICK_PREFIX = 'motusdao-quick-'
  process.env.NEXT_PUBLIC_JITSI_METAVERSE_PREFIX = 'motusdao-meta-'
}

after(() => {
  restoreEnv()
})

describe('therapy room hosts', () => {
  it('builds a therapy URL on jitsi.motusdao.org when NEXT_PUBLIC_JITSI_DOMAIN is missing', () => {
    useDefaultPrefixes()
    delete process.env.NEXT_PUBLIC_JITSI_DOMAIN

    const office = buildOfficeJitsiUrl('match-1')
    const clinical = buildJitsiUrl('sess-1')

    assert.equal(new URL(office).host, THERAPY_JITSI_HOST)
    assert.equal(new URL(clinical).host, THERAPY_JITSI_HOST)
    assert.equal(office.includes('meet.jit.si'), false)
    assert.equal(clinical.includes('meet.jit.si'), false)
  })

  it('does not follow NEXT_PUBLIC_JITSI_DOMAIN when it is meet.jit.si', () => {
    useDefaultPrefixes()
    process.env.NEXT_PUBLIC_JITSI_DOMAIN = 'meet.jit.si'

    const office = buildOfficeJitsiUrl('match-1')
    assert.equal(new URL(office).host, THERAPY_JITSI_HOST)
    assert.equal(office.includes('meet.jit.si'), false)
  })

  it('stores a therapy session on the private host and ignores a public client URL', () => {
    useDefaultPrefixes()
    const clientUrl = 'https://meet.jit.si/motusdao-office-match-9'
    const stored = therapySessionExternalUrl('match-9')

    assert.equal(stored, `https://${THERAPY_JITSI_HOST}/motusdao-office-match-9`)
    assert.equal(stored.includes('meet.jit.si'), false)
    assert.notEqual(stored, clientUrl)
  })
})

describe('opening the media server', () => {
  it('refuses a therapy room with no Hub token, and rewrites a public or open host', () => {
    useDefaultPrefixes()
    const office = 'motusdao-office-abc'

    assert.equal(
      canOpenJitsiMeeting({ domain: THERAPY_JITSI_HOST, roomName: office, jwt: null }),
      false,
    )
    assert.equal(
      canOpenJitsiMeeting({ domain: THERAPY_JITSI_HOST, roomName: office, jwt: '   ' }),
      false,
    )
    assert.equal(
      canOpenJitsiMeeting({ domain: 'meet.jit.si', roomName: office, jwt: 'hub-token' }),
      false,
    )
    assert.equal(
      canOpenJitsiMeeting({ domain: OPEN_JITSI_HOST, roomName: office, jwt: 'hub-token' }),
      false,
    )
    assert.equal(
      canOpenJitsiMeeting({ domain: THERAPY_JITSI_HOST, roomName: office, jwt: 'hub-token' }),
      true,
    )

    assert.deepEqual(
      resolveVideochatRoom({ url: 'https://meet.jit.si/motusdao-office-abc?jwt=stolen' }),
      { domain: THERAPY_JITSI_HOST, roomName: office },
    )
    assert.deepEqual(
      resolveVideochatRoom({ url: `https://${OPEN_JITSI_HOST}/motusdao-sess-1` }),
      { domain: THERAPY_JITSI_HOST, roomName: 'motusdao-sess-1' },
    )
    assert.equal(
      resolveVideochatRoom({ url: 'https://meet.jit.si/not-a-motus-room' }),
      null,
    )

    assert.throws(
      () => buildNativeJitsiMeetingUrl({ domain: THERAPY_JITSI_HOST, roomName: office }),
      /token del Hub/,
    )
  })
})

describe('guest tokens', () => {
  it('returns 403 for a quick room while quick rooms are off', () => {
    useDefaultPrefixes()
    delete process.env.NEXT_PUBLIC_JITSI_QUICK_ROOMS

    const refused = refuseGuestToken('motusdao-quick-demo')
    assert.equal(refused?.status, 403)
    assert.match(refused?.error ?? '', /desactivadas/)
  })

  it('refuses office and clinical rooms so a guest token is never signed for them', () => {
    useDefaultPrefixes()
    process.env.JITSI_APP_ID = 'motusdao'
    process.env.JITSI_APP_SECRET = 'therapy-secret'
    process.env.JITSI_OPEN_APP_ID = 'motusdao-open'
    process.env.JITSI_OPEN_APP_SECRET = 'open-secret'

    for (const roomName of ['motusdao-office-abc', 'motusdao-sess-abc']) {
      const refused = refuseGuestToken(roomName)
      assert.equal(refused?.status, 403)
      assert.equal(meetingSecretKindForRoom(roomName), 'therapy')
      assert.throws(
        () => signJitsiGuestToken({
          roomName,
          guestId: 'guest-1',
          displayName: 'Ada',
        }),
        /consultorio ni una sala clínica/,
      )
    }

    assert.throws(
      () => signJitsiGuestToken({
        roomName: 'motusdao-meta-lobby',
        guestId: 'guest-1',
        displayName: 'Ada',
      }),
      /enlaces abiertos o salas rápidas/,
    )
  })
})

describe('office token audience', () => {
  it('denies a caller who is not the patient, the PSM, or an admin', () => {
    const match = { userId: 'patient', psmId: 'psm' }

    const stranger = decideOfficeRoomAccess({ actorId: 'other', isAdmin: false, match })
    assert.equal(stranger.allowed, false)

    const missing = decideOfficeRoomAccess({ actorId: 'other', isAdmin: false, match: null })
    assert.equal(missing.allowed, false)

    const patient = decideOfficeRoomAccess({ actorId: 'patient', isAdmin: false, match })
    assert.equal(patient.allowed, true)
    assert.equal(patient.moderator, false)

    const psm = decideOfficeRoomAccess({ actorId: 'psm', isAdmin: false, match })
    assert.equal(psm.allowed, true)
    assert.equal(psm.moderator, true)

    const admin = decideOfficeRoomAccess({ actorId: 'admin', isAdmin: true, match: null })
    assert.equal(admin.allowed, true)
    assert.equal(admin.moderator, true)
  })
})

describe('open meetings', () => {
  it('uses meet.motusdao.org and refuses to sign with the therapy secret', () => {
    useDefaultPrefixes()
    delete process.env.NEXT_PUBLIC_JITSI_DOMAIN

    const open = buildOpenJitsiUrl('psm-1')
    const quick = buildQuickJitsiUrl('demo')

    assert.equal(new URL(open).host, OPEN_JITSI_HOST)
    assert.equal(new URL(quick).host, OPEN_JITSI_HOST)
    assert.equal(open.includes(THERAPY_JITSI_HOST), false)
    assert.equal(open.includes('meet.jit.si'), false)
    assert.equal(meetingHostForRoom('motusdao-meta-lobby'), OPEN_JITSI_HOST)
    assert.equal(meetingSecretKindForRoom('motusdao-open-psm-1'), 'open')

    process.env.JITSI_APP_ID = 'motusdao'
    process.env.JITSI_APP_SECRET = 'therapy-secret'
    delete process.env.JITSI_OPEN_APP_ID
    delete process.env.JITSI_OPEN_APP_SECRET
    assert.throws(() => readJitsiSigningKey('open'), /Jitsi abierto no está configurado/)

    process.env.JITSI_OPEN_APP_ID = 'motusdao-open'
    process.env.JITSI_OPEN_APP_SECRET = 'therapy-secret'
    assert.throws(
      () => readJitsiSigningKey('open'),
      /no puede ser el de terapia/,
    )

    process.env.JITSI_OPEN_APP_SECRET = 'open-secret'
    const key = readJitsiSigningKey('open')
    assert.equal(key.secret, 'open-secret')
    assert.notEqual(key.secret, process.env.JITSI_APP_SECRET)

    const therapy = readJitsiSigningKey('therapy')
    assert.equal(therapy.secret, 'therapy-secret')

    assert.throws(
      () => signJitsiAccessToken({
        roomName: 'motusdao-office-abc',
        actorId: 'patient',
        moderator: false,
        kind: 'office',
        secretKind: 'open',
      }),
      /no corresponde a esta sala/,
    )

    const token = signJitsiAccessToken({
      roomName: 'motusdao-open-psm-1',
      actorId: 'guest-1',
      moderator: false,
      kind: 'open',
      secretKind: 'open',
    })
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { iss?: string }
    assert.equal(payload.iss, 'motusdao-open')
  })
})
