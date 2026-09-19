import AgoraRTC from 'agora-rtc-sdk-ng'
import axios from 'axios'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const TICK_INTERVAL = 30 * 1000

const DOCK = 'grid size-13 cursor-pointer place-items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:size-14'

function Control({ icon: Icon, label, off = false, danger = false, onClick, isLandlord = false }) {
  const tone = danger
    ? `border-clay bg-clay ${isLandlord ? 'text-landlord-card' : 'text-[#F7F5EF]'} hover:bg-clay/85`
    : off
      ? 'border-clay/50 bg-clay/15 text-clay hover:bg-clay/25'
      : isLandlord
        ? 'border-landlord-card/20 bg-landlord-card/8 text-landlord-card hover:bg-landlord-card/16'
        : 'border-[#F4F1EA]/20 bg-[#F4F1EA]/8 text-[#F4F1EA] hover:bg-[#F4F1EA]/16'

  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={danger ? undefined : off} title={label} className={`${DOCK} ${tone}`}>
      <Icon aria-hidden className="size-5.5" />
    </button>
  )
}

function CallRoomPage() {
  const { callId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const isLandlord = role === 'landlord'
  const localRef = useRef(null)
  const remoteRef = useRef(null)
  // The Agora client and the published tracks outlive renders and must be torn down exactly once.
  const sessionRef = useRef(null)

  const [call, setCall] = useState(null)
  const [status, setStatus] = useState('Joining…')
  const [error, setError] = useState('')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [hasRemote, setHasRemote] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let isCurrent = true

    const leave = async () => {
      const session = sessionRef.current
      sessionRef.current = null

      if (!session) return

      session.tracks.forEach((track) => {
        track.stop()
        track.close()
      })
      await session.client.leave().catch(() => {})
    }

    const join = async () => {
      try {
        const response = await axios.post(`${BASE_URL}/calls/${callId}/token`, {}, { withCredentials: true })
        const credentials = response.data?.data

        if (!response.data?.success || !credentials?.token) {
          throw new Error(response.data?.message || 'Unable to join the call')
        }
        if (!isCurrent) return

        setCall(credentials.call)
        setStatus('Waiting for the other person to join…')

        const isVideo = credentials.call.mode === 'video'
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType)

          if (mediaType === 'video') {
            user.videoTrack.play(remoteRef.current)
            setHasRemote(true)
          } else {
            user.audioTrack.play()
          }

          setStatus('Connected')
        })
        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') setHasRemote(false)
        })
        client.on('user-left', () => {
          setHasRemote(false)
          setStatus('The other person left the call')
        })

        await client.join(credentials.appId, credentials.channel, credentials.token, credentials.uid)

        const tracks = isVideo
          ? await AgoraRTC.createMicrophoneAndCameraTracks()
          : [await AgoraRTC.createMicrophoneAudioTrack()]

        // A teardown that ran while the devices were opening would otherwise leave the camera on.
        if (!isCurrent) {
          tracks.forEach((track) => {
            track.stop()
            track.close()
          })
          await client.leave().catch(() => {})
          return
        }

        sessionRef.current = { client, tracks }
        await client.publish(tracks)

        if (isVideo) tracks[1].play(localRef.current)
      } catch (joinError) {
        if (isCurrent) {
          setError(joinError.response?.data?.message || joinError.message || 'Unable to join the call')
          setStatus('')
        }
        await leave()
      }
    }

    join()

    return () => {
      isCurrent = false
      leave()
    }
  }, [callId])

  // The room closes with the window the landlord set, so the time left is worth showing.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_INTERVAL)

    return () => clearInterval(timer)
  }, [])

  const toggleTrack = async (index, isOn, setIsOn) => {
    const track = sessionRef.current?.tracks[index]

    if (!track) return

    await track.setEnabled(!isOn)
    setIsOn(!isOn)
  }

  const isVideoCall = call?.mode === 'video'
  const name = call?.counterpart?.name || 'Call'
  const minutesLeft = call?.endAt ? Math.max(0, Math.round((Date.parse(call.endAt) - now) / 60000)) : null

  if (error) {
    return (
      <div className={`grid min-h-dvh place-items-center px-5 ${isLandlord ? 'bg-landlord-ink text-landlord-card' : 'bg-forest-deep text-[#F4F1EA]'}`}>
        <div className={`w-full max-w-md rounded-[26px] border border-clay/40 p-7 text-center ${isLandlord ? 'bg-landlord-navy' : 'bg-clay/10'}`}>
          <h1 className="font-display text-[26px] font-bold tracking-[-.035em]">This call could not start</h1>
          <p className={`mt-2.5 text-[14.5px] leading-relaxed ${isLandlord ? 'text-landlord-card/75' : 'text-[#F4F1EA]/75'}`}>{error}</p>
          <button type="button" onClick={() => navigate('/calls')} className={`mt-6 cursor-pointer rounded-full px-5 py-3 text-[14.5px] font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 ${isLandlord ? 'bg-landlord-cyan text-landlord-ink focus-visible:outline-landlord-cyan' : 'bg-lime text-forest-deep focus-visible:outline-lime'}`}>
            Back to calls
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex h-dvh flex-col overflow-hidden ${isLandlord ? 'bg-landlord-ink text-landlord-card' : 'bg-forest-deep text-[#F4F1EA]'}`}>
      {isLandlord && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_at_84%_0%,rgba(102,221,227,.22),transparent_28rem),linear-gradient(to_right,rgba(252,254,255,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(252,254,255,.055)_1px,transparent_1px)] bg-[size:auto,76px_76px,76px_76px]" />}
      <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className={`font-mono text-[10.5px] uppercase tracking-[.16em] ${isLandlord ? 'text-landlord-cyan' : 'text-forest-mute'}`}>{isVideoCall ? 'Video call' : 'Voice call'}</p>
          <h1 className="mt-1.5 truncate font-display text-[19px] font-bold tracking-[-.03em] sm:text-[22px]">{name}</h1>
        </div>
        <div className={`flex items-center gap-3 text-[13px] ${isLandlord ? 'text-landlord-card/65' : 'text-[#F4F1EA]/65'}`}>
          {call?.listing?.title && <span className="hidden max-w-[32ch] truncate sm:inline">{call.listing.title}</span>}
          {minutesLeft !== null && (
            <span className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-[.08em] tabular-nums ${minutesLeft <= 2 ? 'border-clay/60 bg-clay/15 text-clay' : isLandlord ? 'border-landlord-card/20' : 'border-[#F4F1EA]/20'}`}>
              {minutesLeft} MIN LEFT
            </span>
          )}
        </div>
      </header>

      <main className="relative min-h-0 flex-1 px-4 sm:px-7">
        <div className={`relative mx-auto h-full w-full max-w-6xl overflow-hidden rounded-[26px] border ${isLandlord ? 'border-landlord-card/12 bg-[#081D2D] shadow-[0_34px_70px_-42px_rgba(0,0,0,.95)]' : 'border-[#F4F1EA]/12 bg-[#0A1A16]'}`}>
          <div ref={remoteRef} className="absolute inset-0" />

          {/* A voice call has no remote video to fill this, and neither does a video call before it connects. */}
          {!hasRemote && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div>
                <span aria-hidden className={`relative mx-auto grid size-24 place-items-center rounded-full font-display text-[34px] font-bold sm:size-28 ${isLandlord ? 'bg-landlord-navy text-landlord-cyan' : 'bg-forest text-lime'}`}>
                  <span className={`absolute inset-0 rounded-full animate-pulse-ring ${isLandlord ? 'bg-landlord-cyan/25' : 'bg-lime/25'}`} />
                  <span className="relative">{name.trim()[0]?.toUpperCase() || '?'}</span>
                </span>
                <p className="mt-6 font-display text-[19px] font-semibold tracking-[-.025em]">{name}</p>
                <p className={`mt-1.5 text-[14px] ${isLandlord ? 'text-landlord-card/60' : 'text-[#F4F1EA]/60'}`}>{status}</p>
              </div>
            </div>
          )}

          {isVideoCall && (
            <div className={`absolute right-4 bottom-4 h-28 w-40 overflow-hidden rounded-2xl border shadow-[0_20px_40px_-24px_rgba(0,0,0,.9)] sm:h-32 sm:w-48 ${isLandlord ? 'border-landlord-card/20 bg-[#06141F]' : 'border-[#F4F1EA]/20 bg-[#08120F]'}`}>
              <div ref={localRef} className="absolute inset-0" />
              {!isCameraOn && (
                <p className={`absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[.14em] ${isLandlord ? 'text-landlord-card/55' : 'text-[#F4F1EA]/55'}`}>Camera off</p>
              )}
            </div>
          )}

          {!isMicOn && (
            <p className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-clay/50 bg-clay/15 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.14em] text-clay">
              <MicOff aria-hidden className="size-3.5" /> Muted
            </p>
          )}
        </div>
      </main>

      <div className="relative flex shrink-0 items-center justify-center gap-3 px-5 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <Control icon={isMicOn ? Mic : MicOff} off={!isMicOn} label={isMicOn ? 'Mute microphone' : 'Unmute microphone'} onClick={() => toggleTrack(0, isMicOn, setIsMicOn)} isLandlord={isLandlord} />
        {isVideoCall && (
          <Control icon={isCameraOn ? Video : VideoOff} off={!isCameraOn} label={isCameraOn ? 'Stop video' : 'Start video'} onClick={() => toggleTrack(1, isCameraOn, setIsCameraOn)} isLandlord={isLandlord} />
        )}
        <Control icon={PhoneOff} danger label="Leave call" onClick={() => navigate('/calls')} isLandlord={isLandlord} />
      </div>
    </div>
  )
}

export default CallRoomPage
