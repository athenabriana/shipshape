#!/usr/bin/env bun
/**
 * The companion service: Athena's Telegram bot, answered by the Claude Agent SDK.
 *
 * From anthropics/claude-plugins-official (external_plugins/telegram), at the
 * version UPSTREAM.md names, under the Apache License, Version 2.0. Modified by
 * Athena Briana for Ship Shape as the companion plugin: state outside
 * ~/.claude, the tokens redacted from logs and messages, a few access checks
 * tightened, the skills renamed to /companion:*, Markdown replies, SVG images,
 * a notify tool and voice transcription. Since 0.3.0 it is no longer a Claude
 * Code channel (an MCP server inside a session) but a long-running program of
 * its own: each allowed message runs an Agent SDK conversation (agent.ts) with
 * the permissions in code (permissions.ts), and the watch runs inside it
 * (watch-runner.ts). Every change is listed in UPSTREAM.md.
 *
 * Start it with `bun run companion` from this folder (scripts/run-service.sh
 * finds the newest installed copy). Access control is upstream's: pairing,
 * allowlists, managed by the /companion:access skill in
 * ~/.local/state/companion-telegram/access.json.
 *
 * Telegram's Bot API has no history or search.
 */

import { Bot, GrammyError, InlineKeyboard, InputFile, type Context } from 'grammy'
import type { ReactionTypeEmoji } from 'grammy/types'
import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync, renameSync, realpathSync, chmodSync } from 'fs'
import { homedir } from 'os'
import { execFileSync } from 'child_process'
import { join, extname, sep } from 'path'
import { formatWithOptions } from 'util'
import { balanceFences, sendFormatted } from './format.ts'
import { transcribeAttachment } from './transcribe.ts'
import { adoptLegacyState, legacyStateDir, stateDir } from './state.ts'
import { redact as redactWith, secretsOf } from './redact.ts'
import { Companion, type Inbound, type Outbound } from './agent.ts'
import { ChatSessions } from './chats.ts'
import { runMergeGate } from './merge.ts'
import { WatchRunner } from './watch-runner.ts'
import type { Paths } from './permissions.ts'

// ss: outside ~/.claude, where `dontAsk` sessions cannot write (state.ts). An
// existing token and access.json in upstream's folder are copied over once.
const STATE_DIR = stateDir()
try {
  for (const name of adoptLegacyState()) {
    process.stderr.write(`companion: copied ${name} from ${legacyStateDir()} to ${STATE_DIR}\n`)
  }
} catch (err) {
  // The copy is a convenience: without it the server still starts, and says what is missing.
  process.stderr.write(`companion: could not copy the old state from ${legacyStateDir()}: ${err}\n`)
}
const ACCESS_FILE = join(STATE_DIR, 'access.json')
const APPROVED_DIR = join(STATE_DIR, 'approved')
const ENV_FILE = join(STATE_DIR, '.env')

// Load STATE_DIR/.env into process.env. Real env wins.
// Plugin-spawned servers don't get an env block — this is where the token lives.
try {
  // Token is a credential — lock to owner. No-op on Windows (would need ACLs).
  chmodSync(ENV_FILE, 0o600)
  // ss: split on \r?\n, so a CRLF file still loads (`.` stops at \r).
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\w+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
} catch {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
// ss: Claude's own token (`claude setup-token`) comes from the same .env. Only
// the Agent SDK's Claude Code process gets it (agent.ts); every other child
// gets neither token (redact.ts, childEnv).
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN && !process.env.ANTHROPIC_API_KEY) {
  process.stderr.write(
    `companion: no CLAUDE_CODE_OAUTH_TOKEN in ${ENV_FILE}\n` +
    `  run \`claude setup-token\` and save its token with scripts/token-env.sh set claude;\n` +
    `  until then Claude Code falls back to this machine's own login, if any\n`,
  )
}
const STATIC = process.env.TELEGRAM_ACCESS_MODE === 'static'

if (!TOKEN) {
  process.stderr.write(
    `companion: TELEGRAM_BOT_TOKEN required\n` +
    `  set in ${ENV_FILE}\n` +
    `  format: TELEGRAM_BOT_TOKEN=123456789:AAH...\n`,
  )
  process.exit(1)
}

// ss: the token is a credential and must never reach a log or a tool result.
// Everything the server prints goes through process.stderr.write, which is
// wrapped here. Bun's console writes to fd 2 without that call, and grammy
// logs through console.error (a fetch error can carry the URL that embeds the
// token), so console is routed through the wrapper too. Tool errors go back to
// Claude through redact() in the CallTool handler.
// ss: both tokens (the bot's and Claude's) are masked, whichever line carries them.
const SECRETS = [...new Set([...secretsOf(), TOKEN, TOKEN.trim()])].filter(Boolean)
function redact(text: string): string {
  return redactWith(text, SECRETS)
}
const writeStderr = process.stderr.write.bind(process.stderr)
process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  if (typeof chunk === 'string') return writeStderr(redact(chunk), ...(rest as []))
  const bytes = Buffer.from(chunk)
  const leaks = SECRETS.some(secret => bytes.includes(secret))
  return writeStderr(leaks ? redact(bytes.toString('utf8')) : chunk, ...(rest as []))
}) as typeof process.stderr.write
for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  // Every log line goes to stderr, through the redacting wrapper.
  console[level] = (...args: unknown[]) => {
    process.stderr.write(formatWithOptions({ colors: false }, ...args) + '\n')
  }
}
console.trace = (...args: unknown[]) => {
  const stack = new Error().stack?.split('\n').slice(2).join('\n') ?? ''
  process.stderr.write(`Trace: ${formatWithOptions({ colors: false }, ...args)}\n${stack}\n`)
}
const INBOX_DIR = join(STATE_DIR, 'inbox')
const PID_FILE = join(STATE_DIR, 'bot.pid')

// Telegram allows exactly one getUpdates consumer per token. If a previous
// session crashed (SIGKILL, terminal closed) its server.ts grandchild can
// survive as an orphan and hold the slot forever, so every new session sees
// 409 Conflict. Kill any stale holder before we start polling.
mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
try {
  const stale = parseInt(readFileSync(PID_FILE, 'utf8'), 10)
  if (stale > 1 && stale !== process.pid) {
    process.kill(stale, 0)
    // PID files race with OS PID recycling — verify the holder is actually a
    // server.ts process before SIGTERM. Otherwise a recycled PID can point at
    // our own bun-run wrapper (kills our stdin → immediate self-shutdown) or
    // an unrelated user process.
    const cmd = execFileSync('ps', ['-p', String(stale), '-o', 'args='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    if (cmd.includes('server.ts')) {
      process.stderr.write(`companion: replacing stale poller pid=${stale}\n`)
      process.kill(stale, 'SIGTERM')
    }
  }
} catch {}
writeFileSync(PID_FILE, String(process.pid))

// Last-resort safety net — without these the process dies silently on any
// unhandled promise rejection. With them it logs and keeps serving tools.
process.on('unhandledRejection', err => {
  process.stderr.write(`companion: unhandled rejection: ${err}\n`)
})
process.on('uncaughtException', err => {
  process.stderr.write(`companion: uncaught exception: ${err}\n`)
})

// A typed answer to a permission button: "yes abcde" or "no abcde".
// 5 lowercase letters a-z minus 'l'. Case-insensitive for phone autocorrect.
// Strict: no bare yes/no (conversational), no prefix/suffix chatter.
const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

const bot = new Bot(TOKEN)
let botUsername = ''

type PendingEntry = {
  senderId: string
  chatId: string
  createdAt: number
  expiresAt: number
  replies: number
}

type GroupPolicy = {
  requireMention: boolean
  allowFrom: string[]
}

type Access = {
  dmPolicy: 'pairing' | 'allowlist' | 'disabled'
  allowFrom: string[]
  groups: Record<string, GroupPolicy>
  pending: Record<string, PendingEntry>
  mentionPatterns?: string[]
  // delivery/UX config — optional, defaults live in the reply handler
  /** Emoji to react with on receipt. Empty string disables. Telegram only accepts its fixed whitelist. */
  ackReaction?: string
  /** Which chunks get Telegram's reply reference when reply_to is passed. Default: 'first'. 'off' = never thread. */
  replyToMode?: 'off' | 'first' | 'all'
  /** Max chars per outbound message before splitting. Default: 4096 (Telegram's hard cap). */
  textChunkLimit?: number
  /** Split on paragraph boundaries instead of hard char count. */
  chunkMode?: 'length' | 'newline'
}

function defaultAccess(): Access {
  return {
    dmPolicy: 'pairing',
    allowFrom: [],
    groups: {},
    pending: {},
  }
}

const MAX_CHUNK_LIMIT = 4096
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

// reply's files param takes any path. .env is ~60 bytes and ships as a
// document. Claude can already Read+paste file contents, so this isn't a new
// exfil channel for arbitrary paths — but the server's own state is the one
// thing Claude has no reason to ever send.
function assertSendable(f: string): void {
  let real, stateReal: string
  try {
    real = realpathSync(f)
    stateReal = realpathSync(STATE_DIR)
  } catch { return } // statSync will fail properly; or STATE_DIR absent → nothing to leak
  const inbox = join(stateReal, 'inbox')
  if (real.startsWith(stateReal + sep) && !real.startsWith(inbox + sep)) {
    throw new Error(`refusing to send channel state: ${f}`)
  }
}

function readAccessFile(): Access {
  try {
    const raw = readFileSync(ACCESS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<Access>
    return {
      dmPolicy: parsed.dmPolicy ?? 'pairing',
      allowFrom: parsed.allowFrom ?? [],
      groups: parsed.groups ?? {},
      pending: parsed.pending ?? {},
      mentionPatterns: parsed.mentionPatterns,
      ackReaction: parsed.ackReaction,
      replyToMode: parsed.replyToMode,
      textChunkLimit: parsed.textChunkLimit,
      chunkMode: parsed.chunkMode,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return defaultAccess()
    try {
      renameSync(ACCESS_FILE, `${ACCESS_FILE}.corrupt-${Date.now()}`)
    } catch {}
    process.stderr.write(`companion: access.json is corrupt, moved aside. Starting fresh.\n`)
    return defaultAccess()
  }
}

// In static mode, access is snapshotted at boot and never re-read or written.
// Pairing requires runtime mutation, so it's downgraded to allowlist with a
// startup warning — handing out codes that never get approved would be worse.
const BOOT_ACCESS: Access | null = STATIC
  ? (() => {
      const a = readAccessFile()
      if (a.dmPolicy === 'pairing') {
        process.stderr.write(
          'companion: static mode — dmPolicy "pairing" downgraded to "allowlist"\n',
        )
        a.dmPolicy = 'allowlist'
      }
      a.pending = {}
      return a
    })()
  : null

function loadAccess(): Access {
  return BOOT_ACCESS ?? readAccessFile()
}

// Outbound gate — reply/react/edit can only target chats the inbound gate
// would deliver from. Telegram DM chat_id == user_id, so allowFrom covers DMs.
function assertAllowedChat(chat_id: string): void {
  const access = loadAccess()
  if (access.allowFrom.includes(chat_id)) return
  if (chat_id in access.groups) return
  throw new Error(`chat ${chat_id} is not allowlisted — add via /companion:access`)
}

function saveAccess(a: Access): void {
  if (STATIC) return
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
  const tmp = ACCESS_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(a, null, 2) + '\n', { mode: 0o600 })
  renameSync(tmp, ACCESS_FILE)
}

function pruneExpired(a: Access): boolean {
  const now = Date.now()
  let changed = false
  for (const [code, p] of Object.entries(a.pending)) {
    if (p.expiresAt < now) {
      delete a.pending[code]
      changed = true
    }
  }
  return changed
}

type GateResult =
  | { action: 'deliver'; access: Access }
  | { action: 'drop' }
  | { action: 'pair'; code: string; isResend: boolean }

function gate(ctx: Context): GateResult {
  const access = loadAccess()
  const pruned = pruneExpired(access)
  if (pruned) saveAccess(access)

  if (access.dmPolicy === 'disabled') return { action: 'drop' }

  const from = ctx.from
  if (!from) return { action: 'drop' }
  const senderId = String(from.id)
  const chatType = ctx.chat?.type

  if (chatType === 'private') {
    if (access.allowFrom.includes(senderId)) return { action: 'deliver', access }
    if (access.dmPolicy === 'allowlist') return { action: 'drop' }

    // pairing mode — check for existing non-expired code for this sender
    for (const [code, p] of Object.entries(access.pending)) {
      if (p.senderId === senderId) {
        // Reply twice max (initial + one reminder), then go silent.
        if ((p.replies ?? 1) >= 2) return { action: 'drop' }
        p.replies = (p.replies ?? 1) + 1
        saveAccess(access)
        return { action: 'pair', code, isResend: true }
      }
    }
    // Cap pending at 3. Extra attempts are silently dropped.
    if (Object.keys(access.pending).length >= 3) return { action: 'drop' }

    const code = randomBytes(3).toString('hex') // 6 hex chars
    const now = Date.now()
    access.pending[code] = {
      senderId,
      chatId: String(ctx.chat!.id),
      createdAt: now,
      expiresAt: now + 60 * 60 * 1000, // 1h
      replies: 1,
    }
    saveAccess(access)
    return { action: 'pair', code, isResend: false }
  }

  if (chatType === 'group' || chatType === 'supergroup') {
    const groupId = String(ctx.chat!.id)
    const policy = access.groups[groupId]
    if (!policy) return { action: 'drop' }
    const groupAllowFrom = policy.allowFrom ?? []
    const requireMention = policy.requireMention ?? true
    if (groupAllowFrom.length > 0 && !groupAllowFrom.includes(senderId)) {
      return { action: 'drop' }
    }
    if (requireMention && !isMentioned(ctx, access.mentionPatterns)) {
      return { action: 'drop' }
    }
    return { action: 'deliver', access }
  }

  return { action: 'drop' }
}

// Like gate() but for bot commands: no pairing side effects, just allow/drop.
function dmCommandGate(ctx: Context): { access: Access; senderId: string } | null {
  if (ctx.chat?.type !== 'private') return null
  if (!ctx.from) return null
  const senderId = String(ctx.from.id)
  const access = loadAccess()
  const pruned = pruneExpired(access)
  if (pruned) saveAccess(access)
  if (access.dmPolicy === 'disabled') return null
  if (access.dmPolicy === 'allowlist' && !access.allowFrom.includes(senderId)) return null
  return { access, senderId }
}

function isMentioned(ctx: Context, extraPatterns?: string[]): boolean {
  const entities = ctx.message?.entities ?? ctx.message?.caption_entities ?? []
  const text = ctx.message?.text ?? ctx.message?.caption ?? ''
  for (const e of entities) {
    if (e.type === 'mention') {
      const mentioned = text.slice(e.offset, e.offset + e.length)
      if (mentioned.toLowerCase() === `@${botUsername}`.toLowerCase()) return true
    }
    if (e.type === 'text_mention' && e.user?.is_bot && e.user.username === botUsername) {
      return true
    }
  }

  // Reply to one of our messages counts as an implicit mention.
  if (ctx.message?.reply_to_message?.from?.username === botUsername) return true

  for (const pat of extraPatterns ?? []) {
    try {
      if (new RegExp(pat, 'i').test(text)) return true
    } catch {
      // Invalid user-supplied regex — skip it.
    }
  }
  return false
}

// The /companion:access skill drops a file at approved/<senderId> when it pairs
// someone. Poll for it, send confirmation, clean up. For Telegram DMs,
// chatId == senderId, so we can send directly without stashing chatId.

function checkApprovals(): void {
  let files: string[]
  try {
    files = readdirSync(APPROVED_DIR)
  } catch {
    return
  }
  if (files.length === 0) return

  for (const senderId of files) {
    const file = join(APPROVED_DIR, senderId)
    void bot.api.sendMessage(senderId, "Paired! Say hi to Claude.").then(
      () => rmSync(file, { force: true }),
      err => {
        process.stderr.write(`companion: failed to send approval confirm: ${err}\n`)
        // Remove anyway — don't loop on a broken send.
        rmSync(file, { force: true })
      },
    )
  }
}

if (!STATIC) setInterval(checkApprovals, 5000).unref()

// Telegram caps messages at 4096 chars. Split long replies, preferring
// paragraph boundaries when chunkMode is 'newline'.

function chunk(text: string, limit: number, mode: 'length' | 'newline'): string[] {
  if (text.length <= limit) return [text]
  const out: string[] = []
  let rest = text
  while (rest.length > limit) {
    let cut = limit
    if (mode === 'newline') {
      // Prefer the last double-newline (paragraph), then single newline,
      // then space. Fall back to hard cut.
      const para = rest.lastIndexOf('\n\n', limit)
      const line = rest.lastIndexOf('\n', limit)
      const space = rest.lastIndexOf(' ', limit)
      cut = para > limit / 2 ? para : line > limit / 2 ? line : space > 0 ? space : limit
    }
    out.push(rest.slice(0, cut))
    rest = rest.slice(cut).replace(/^\n+/, '')
  }
  if (rest) out.push(rest)
  return out
}

// .jpg/.jpeg/.png/.gif/.webp go as photos (Telegram compresses + shows inline);
// everything else goes as documents (raw file, no compression).
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])

// ss: permission asks from the agent (agent.ts, canUseTool) wait here for a tap
// on the button, a typed "yes/no CODE", or the timeout, which denies.
const ASK_TIMEOUT_MS = Math.max(30, Number(process.env.COMPANION_ASK_TIMEOUT_SEC) || 600) * 1000
type PendingAsk = { chatId: string; text: string; detail: string; resolve: (yes: boolean) => void }
const pendingAsks = new Map<string, PendingAsk>()

function newAskId(): string {
  const letters = 'abcdefghijkmnopqrstuvwxyz'
  let id = ''
  for (const b of randomBytes(5)) id += letters[b % letters.length]
  return pendingAsks.has(id) ? newAskId() : id
}

function askButton(chatId: string, text: string, detail: string, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    const id = newAskId()
    let messageId: number | undefined
    const finish = (yes: boolean, label: string) => {
      if (!pendingAsks.has(id)) return
      pendingAsks.delete(id)
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      if (messageId != null) {
        void bot.api.editMessageText(chatId, messageId, `${text}\n\n${label}`).catch(() => {})
      }
      resolve(yes)
    }
    const timer = setTimeout(() => finish(false, '⏱ Sem resposta, negado.'), ASK_TIMEOUT_MS)
    const onAbort = () => finish(false, '✖ Cancelado.')
    signal.addEventListener('abort', onAbort)
    pendingAsks.set(id, { chatId, text, detail, resolve: yes => finish(yes, yes ? '✅ Permitido' : '❌ Negado') })
    const keyboard = new InlineKeyboard()
      .text('Ver mais', `perm:more:${id}`)
      .text('✅ Permitir', `perm:allow:${id}`)
      .text('❌ Negar', `perm:deny:${id}`)
    bot.api.sendMessage(chatId, text, { reply_markup: keyboard }).then(
      sent => { messageId = sent.message_id },
      err => {
        process.stderr.write(`companion: permission ask could not be sent: ${err}\n`)
        finish(false, '')
      },
    )
  })
}

// ss: download_attachment's body, shared with voice transcription.
async function downloadToInbox(file_id: string): Promise<string> {
  const file = await bot.api.getFile(file_id)
  if (!file.file_path) throw new Error('Telegram returned no file_path — file may have expired')
  const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // file_path is from Telegram (trusted), but strip to safe chars anyway
  // so nothing downstream can be tricked by an unexpected extension.
  const rawExt = file.file_path.includes('.') ? file.file_path.split('.').pop()! : 'bin'
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
  const uniqueId = (file.file_unique_id ?? '').replace(/[^a-zA-Z0-9_-]/g, '') || 'dl'
  const path = join(INBOX_DIR, `${Date.now()}-${uniqueId}.${ext}`)
  mkdirSync(INBOX_DIR, { recursive: true, mode: 0o700 })
  // ss: downloads, voice recordings among them, are readable by the owner only.
  writeFileSync(path, buf, { mode: 0o600 })
  return path
}

// ss: voice notes are transcribed one at a time, in the order they arrived, so
// a later, shorter note never overtakes an earlier one and only one whisper
// job uses the CPU.
let voiceQueue: Promise<void> = Promise.resolve()

// ss: what reply and notify share (the Outbound type is agent.ts's). Markdown
// is the default format: it is converted to Telegram HTML and sent as plain
// text when Telegram refuses the result. SVG markup renders to a PNG in the
// inbox, so the agent draws without writing files of its own.
function sentSummary(sentIds: number[]): string {
  return sentIds.length === 1
    ? `sent (id: ${sentIds[0]})`
    : `sent ${sentIds.length} parts (ids: ${sentIds.join(', ')})`
}

async function sendText(
  chat_id: string,
  text: string,
  format: string,
  extra: { reply_parameters?: { message_id: number } },
): Promise<number> {
  const sent = await sendFormatted(text, format, (body, parse_mode) =>
    bot.api.sendMessage(chat_id, body, { ...extra, ...(parse_mode ? { parse_mode } : {}) }))
  return sent.message_id
}

// ss: media.ts loads a native renderer, so it is imported only when a message
// carries an SVG. If it cannot load, that one call fails and the channel stays up.
async function loadMedia() {
  try {
    return await import('./media.ts')
  } catch (err) {
    throw new Error(`svg rendering is unavailable here: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function deliver(chat_id: string, o: Outbound): Promise<number[]> {
  for (const f of o.files) {
    assertSendable(f)
    const st = statSync(f)
    if (st.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`file too large: ${f} (${(st.size / 1024 / 1024).toFixed(1)}MB, max 50MB)`)
    }
  }
  // Render before sending anything, so a broken SVG fails the call cleanly.
  const needsMedia = o.svgs.length > 0 || o.files.some(f => extname(f).toLowerCase() === '.svg')
  const media = needsMedia ? await loadMedia() : undefined
  const rendered: string[] = []
  const render = (svg: string, label: string) => {
    try {
      const path = media!.renderSvg(svg, INBOX_DIR)
      rendered.push(path)
      return path
    } catch (err) {
      throw new Error(`${label} could not be rendered: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const sentIds: number[] = []
  try {
    // An .svg path renders too: Telegram would only offer it as a file to download.
    const files = o.files.map(f => extname(f).toLowerCase() === '.svg' ? render(readFileSync(f, 'utf8'), f) : f)
    o.svgs.forEach((svg, i) => render(svg, `svg ${i + 1}`))
    const attachments = [...files, ...rendered.filter(p => !files.includes(p))]

    const access = loadAccess()
    const limit = Math.max(1, Math.min(access.textChunkLimit ?? MAX_CHUNK_LIMIT, MAX_CHUNK_LIMIT))
    const mode = access.chunkMode ?? 'length'
    const replyMode = access.replyToMode ?? 'first'
    // A code block cut between chunks is closed and reopened, which adds a few
    // characters, so Markdown chunks leave room for them.
    const markdown = o.format === 'markdown'
    const raw = o.text.trim() ? chunk(o.text, markdown ? Math.max(1, limit - 32) : limit, mode) : []
    const chunks = markdown ? balanceFences(raw) : raw
    const parts = chunks.length + attachments.length

    try {
      for (let i = 0; i < chunks.length; i++) {
        const shouldReplyTo =
          o.reply_to != null &&
          replyMode !== 'off' &&
          (replyMode === 'all' || i === 0)
        sentIds.push(await sendText(chat_id, chunks[i], o.format,
          shouldReplyTo ? { reply_parameters: { message_id: o.reply_to! } } : {}))
      }

      // Files go as separate messages (Telegram doesn't mix text+file in one
      // sendMessage call). Thread under reply_to if present.
      for (const f of attachments) {
        const ext = extname(f).toLowerCase()
        const input = new InputFile(f)
        const opts = o.reply_to != null && replyMode !== 'off'
          ? { reply_parameters: { message_id: o.reply_to } }
          : undefined
        // A photo over Telegram's 10 MB limit goes as a document instead.
        const asPhoto = PHOTO_EXTS.has(ext) && statSync(f).size <= (media?.MAX_PHOTO_BYTES ?? 10 * 1024 * 1024)
        const sent = asPhoto
          ? await bot.api.sendPhoto(chat_id, input, opts)
          : await bot.api.sendDocument(chat_id, input, opts)
        sentIds.push(sent.message_id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`send failed after ${sentIds.length} of ${parts} part(s) sent: ${msg}`)
    }
  } finally {
    // ss: a rendered picture is not kept once it is sent.
    for (const p of rendered) rmSync(p, { force: true })
  }
  if (sentIds.length === 0) throw new Error('nothing to send: pass text, files or svgs')
  return sentIds
}

// ss: what the agent's notify tool does: news to every allowlisted person in a DM.
async function notifyOwners(o: Outbound): Promise<string> {
  // DMs only: in Telegram a DM's chat_id is the user's ID, and groups never
  // get messages nobody in them asked for.
  const access = loadAccess()
  if (access.dmPolicy === 'disabled') throw new Error('notify is off: the DM policy is disabled')
  const owners = access.allowFrom
  if (owners.length === 0) throw new Error('nobody is allowlisted yet: pair first with /companion:access')
  const lines: string[] = []
  let delivered = 0
  for (const chat_id of owners) {
    try {
      lines.push(`${chat_id}: ${sentSummary(await deliver(chat_id, { ...o, reply_to: undefined }))}`)
      delivered++
    } catch (err) {
      lines.push(`${chat_id}: failed: ${redact(err instanceof Error ? err.message : String(err))}`)
    }
  }
  if (delivered === 0) throw new Error(lines.join('; '))
  return lines.join('\n')
}

// ss: the agent. Its working folder holds its memory; her repositories are read
// without asking (COMPANION_REPOS, colon-separated, default ~/Workspaces).
const DATA_DIR = process.env.COMPANION_DATA_DIR
  || join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'companion')
mkdirSync(join(DATA_DIR, 'memory'), { recursive: true, mode: 0o700 })
const PATHS: Paths = {
  home: homedir(),
  stateDir: STATE_DIR,
  dataDir: DATA_DIR,
  pluginRoot: import.meta.dir,
  readRoots: (process.env.COMPANION_REPOS || join(homedir(), 'Workspaces')).split(':').filter(Boolean),
}
const PERSONA = readFileSync(join(import.meta.dir, 'persona.md'), 'utf8')
  .replaceAll('<plugin-root>', import.meta.dir)
  .replaceAll('<memory-dir>', join(DATA_DIR, 'memory'))

const companion = new Companion({
  paths: PATHS,
  persona: PERSONA,
  sessions: new ChatSessions(join(STATE_DIR, 'sessions.json')),
  model: process.env.COMPANION_MODEL || undefined,
  gate: (repo, number) => runMergeGate(import.meta.dir, repo, number),
  io: {
    deliver: (chatId, o) => { assertAllowedChat(chatId); return deliver(chatId, o) },
    notify: notifyOwners,
    react: async (chatId, messageId, emoji) => {
      assertAllowedChat(chatId)
      await bot.api.setMessageReaction(chatId, messageId, [
        { type: 'emoji', emoji: emoji as ReactionTypeEmoji['emoji'] },
      ])
    },
    edit: async (chatId, messageId, text, format) => {
      assertAllowedChat(chatId)
      await sendFormatted(text, format, (body, parse_mode) =>
        bot.api.editMessageText(chatId, messageId, body, ...(parse_mode ? [{ parse_mode }] : [])))
    },
    download: downloadToInbox,
    askButton,
    typing: chatId => void bot.api.sendChatAction(chatId, 'typing').catch(() => {}),
    log: line => process.stderr.write(`${line}\n`),
  },
})

// ss: the watch wakes the agent in the first allowlisted person's DM, the chat
// her answers to a ping come back in.
const watch = new WatchRunner({
  pluginRoot: import.meta.dir,
  stateFile: join(STATE_DIR, 'watch.json'),
  log: line => process.stderr.write(`${line}\n`),
  onEvents: lines => {
    const owner = loadAccess().allowFrom[0]
    if (!owner) {
      process.stderr.write('companion: watch events with nobody allowlisted yet, dropped\n')
      return
    }
    for (const line of lines) companion.submit(owner, { kind: 'watch', line })
  },
})
if (process.env.COMPANION_WATCH !== 'off') watch.start()

let shuttingDown = false
function shutdown(): void {
  if (shuttingDown) return
  shuttingDown = true
  process.stderr.write('companion: shutting down\n')
  watch.stop()
  companion.stop()
  try {
    if (parseInt(readFileSync(PID_FILE, 'utf8'), 10) === process.pid) rmSync(PID_FILE)
  } catch {}
  // bot.stop() signals the poll loop to end; the current getUpdates request
  // may take up to its long-poll timeout to return. Force-exit after 2s.
  setTimeout(() => process.exit(0), 2000)
  void Promise.resolve(bot.stop()).finally(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGHUP', shutdown)

// Commands are DM-only. Responding in groups would: (1) leak pairing codes via
// /status to other group members, (2) confirm bot presence in non-allowlisted
// groups, (3) spam channels the operator never approved. Silent drop matches
// the gate's behavior for unrecognized groups.

bot.command('start', async ctx => {
  if (!dmCommandGate(ctx)) return
  await ctx.reply(
    `This bot is a personal assistant that answers through Claude.\n\n` +
    `To pair:\n` +
    `1. DM me anything — you'll get a 6-char code\n` +
    `2. In any Claude Code session with the companion plugin: /companion:access pair <code>\n\n` +
    `After that, DMs here reach the assistant.`
  )
})

bot.command('help', async ctx => {
  if (!dmCommandGate(ctx)) return
  await ctx.reply(
    `Messages you send here reach the assistant, which answers here. ` +
    `Text, photos, files and voice notes work.\n\n` +
    `/nova — start a fresh conversation\n` +
    `/start — pairing instructions\n` +
    `/status — check your pairing state`
  )
})

// ss: forgets this chat's Agent SDK session; the next message starts a new one.
bot.command('nova', async ctx => {
  const gated = dmCommandGate(ctx)
  if (!gated || !gated.access.allowFrom.includes(gated.senderId)) return
  const forgot = new ChatSessions(join(STATE_DIR, 'sessions.json')).forget(String(ctx.chat!.id))
  await ctx.reply(forgot ? 'Conversa nova. Pode falar.' : 'Já é uma conversa nova.')
})

bot.command('status', async ctx => {
  const gated = dmCommandGate(ctx)
  if (!gated) return
  const { access, senderId } = gated

  if (access.allowFrom.includes(senderId)) {
    const name = ctx.from!.username ? `@${ctx.from!.username}` : senderId
    await ctx.reply(`Paired as ${name}.`)
    return
  }

  for (const [code, p] of Object.entries(access.pending)) {
    if (p.senderId === senderId) {
      await ctx.reply(
        `Pending pairing — run in Claude Code:\n\n/companion:access pair ${code}`
      )
      return
    }
  }

  await ctx.reply(`Not paired. Send me a message to get a pairing code.`)
})

// Inline-button handler for permission asks. Callback data is
// `perm:allow:<id>`, `perm:deny:<id>`, or `perm:more:<id>`.
// ss: only the person the ask went to answers it: the sender must be
// allowlisted and be that DM's user (in Telegram a DM's chat_id is the user's ID).
bot.on('callback_query:data', async ctx => {
  const data = ctx.callbackQuery.data
  const m = /^perm:(allow|deny|more):([a-km-z]{5})$/.exec(data)
  if (!m) {
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }
  const [, behavior, id] = m
  const ask = pendingAsks.get(id)
  if (!ask) {
    await ctx.answerCallbackQuery({ text: 'Já resolvido.' }).catch(() => {})
    return
  }
  const senderId = String(ctx.from.id)
  if (!loadAccess().allowFrom.includes(senderId) || senderId !== ask.chatId) {
    await ctx.answerCallbackQuery({ text: 'Not authorized.' }).catch(() => {})
    return
  }

  if (behavior === 'more') {
    const keyboard = new InlineKeyboard()
      .text('✅ Permitir', `perm:allow:${id}`)
      .text('❌ Negar', `perm:deny:${id}`)
    await ctx.editMessageText(`${ask.text}\n\n${ask.detail}`, { reply_markup: keyboard }).catch(() => {})
    await ctx.answerCallbackQuery().catch(() => {})
    return
  }

  const yes = behavior === 'allow'
  ask.resolve(yes)
  await ctx.answerCallbackQuery({ text: yes ? '✅ Permitido' : '❌ Negado' }).catch(() => {})
})

bot.on('message:text', async ctx => {
  await handleInbound(ctx, ctx.message.text, undefined)
})

bot.on('message:photo', async ctx => {
  const caption = ctx.message.caption ?? '(photo)'
  // Defer download until after the gate approves — any user can send photos,
  // and we don't want to burn API quota or fill the inbox for dropped messages.
  await handleInbound(ctx, caption, async () => {
    // Largest size is last in the array.
    const photos = ctx.message.photo
    const best = photos[photos.length - 1]
    try {
      const file = await ctx.api.getFile(best.file_id)
      if (!file.file_path) return undefined
      const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`
      const res = await fetch(url)
      const buf = Buffer.from(await res.arrayBuffer())
      const ext = file.file_path.split('.').pop() ?? 'jpg'
      const path = join(INBOX_DIR, `${Date.now()}-${best.file_unique_id}.${ext}`)
      mkdirSync(INBOX_DIR, { recursive: true })
      writeFileSync(path, buf)
      return path
    } catch (err) {
      process.stderr.write(`companion: photo download failed: ${err}\n`)
      return undefined
    }
  })
})

bot.on('message:document', async ctx => {
  const doc = ctx.message.document
  const name = safeName(doc.file_name)
  const text = ctx.message.caption ?? `(document: ${name ?? 'file'})`
  await handleInbound(ctx, text, undefined, {
    kind: 'document',
    file_id: doc.file_id,
    size: doc.file_size,
    mime: doc.mime_type,
    name,
  })
})

bot.on('message:voice', async ctx => {
  const voice = ctx.message.voice
  const text = ctx.message.caption ?? '(voice message)'
  await handleInbound(ctx, text, undefined, {
    kind: 'voice',
    file_id: voice.file_id,
    size: voice.file_size,
    mime: voice.mime_type,
  })
})

bot.on('message:audio', async ctx => {
  const audio = ctx.message.audio
  const name = safeName(audio.file_name)
  const text = ctx.message.caption ?? `(audio: ${safeName(audio.title) ?? name ?? 'audio'})`
  await handleInbound(ctx, text, undefined, {
    kind: 'audio',
    file_id: audio.file_id,
    size: audio.file_size,
    mime: audio.mime_type,
    name,
  })
})

bot.on('message:video', async ctx => {
  const video = ctx.message.video
  const text = ctx.message.caption ?? '(video)'
  await handleInbound(ctx, text, undefined, {
    kind: 'video',
    file_id: video.file_id,
    size: video.file_size,
    mime: video.mime_type,
    name: safeName(video.file_name),
  })
})

bot.on('message:video_note', async ctx => {
  const vn = ctx.message.video_note
  await handleInbound(ctx, '(video note)', undefined, {
    kind: 'video_note',
    file_id: vn.file_id,
    size: vn.file_size,
  })
})

bot.on('message:sticker', async ctx => {
  const sticker = ctx.message.sticker
  const emoji = sticker.emoji ? ` ${sticker.emoji}` : ''
  await handleInbound(ctx, `(sticker${emoji})`, undefined, {
    kind: 'sticker',
    file_id: sticker.file_id,
    size: sticker.file_size,
  })
})

type AttachmentMeta = {
  kind: string
  file_id: string
  size?: number
  mime?: string
  name?: string
}

// Filenames and titles are uploader-controlled. They land inside the <channel>
// notification — delimiter chars would let the uploader break out of the tag
// or forge a second meta entry.
function safeName(s: string | undefined): string | undefined {
  // ss: quotes too, so a value cannot close a meta attribute.
  return s?.replace(/[<>\[\]\r\n;"']/g, '_')
}

async function handleInbound(
  ctx: Context,
  text: string,
  downloadImage: (() => Promise<string | undefined>) | undefined,
  attachment?: AttachmentMeta,
): Promise<void> {
  const result = gate(ctx)

  if (result.action === 'drop') return

  if (result.action === 'pair') {
    const lead = result.isResend ? 'Still pending' : 'Pairing required'
    await ctx.reply(
      `${lead} — run in Claude Code:\n\n/companion:access pair ${result.code}`,
    )
    return
  }

  const access = result.access
  const from = ctx.from!
  const chat_id = String(ctx.chat!.id)
  const msgId = ctx.message?.message_id

  // ss: the assistant acts with Athena's permissions, so it answers only the
  // allowlisted people in their own DMs. A group message never wakes it.
  if (ctx.chat?.type !== 'private' || !access.allowFrom.includes(String(from.id))) {
    process.stderr.write(`companion: a message from chat ${chat_id} was not for the assistant, dropped\n`)
    return
  }

  // A typed "yes abcde" / "no abcde" answers that permission ask, like its button.
  const permMatch = PERMISSION_REPLY_RE.exec(text)
  if (permMatch) {
    const ask = pendingAsks.get(permMatch[2]!.toLowerCase())
    const yes = permMatch[1]!.toLowerCase().startsWith('y')
    if (ask && ask.chatId === chat_id) ask.resolve(yes)
    if (msgId != null) {
      void bot.api.setMessageReaction(chat_id, msgId, [
        { type: 'emoji', emoji: (yes ? '👍' : '👎') as ReactionTypeEmoji['emoji'] },
      ]).catch(() => {})
    }
    return
  }

  // Typing indicator — signals "processing" until we reply (or ~5s elapses).
  void bot.api.sendChatAction(chat_id, 'typing').catch(() => {})

  // Ack reaction — lets the user know we're processing. Fire-and-forget.
  // Telegram only accepts a fixed emoji whitelist — if the user configures
  // something outside that set the API rejects it and we swallow.
  if (access.ackReaction && msgId != null) {
    void bot.api
      .setMessageReaction(chat_id, msgId, [
        { type: 'emoji', emoji: access.ackReaction as ReactionTypeEmoji['emoji'] },
      ])
      .catch(() => {})
  }

  const imagePath = downloadImage ? await downloadImage() : undefined
  // ss: a forwarded message carries someone else's words: never her word on a merge.
  const forwarded = Boolean(ctx.message && 'forward_origin' in ctx.message && ctx.message.forward_origin)

  // image_path goes in the tag's attributes only — an in-content "[image attached — read: PATH]"
  // annotation is forgeable by any allowlisted sender typing that string.
  const emit = (content: string, transcript: boolean) => {
    const item: Inbound = {
      kind: 'chat',
      text: content,
      typed: !transcript && !forwarded,
      attrs: {
        ...(msgId != null ? { message_id: String(msgId) } : {}),
        user: from.username ?? String(from.id),
        ts: new Date((ctx.message?.date ?? 0) * 1000).toISOString(),
        ...(imagePath ? { image_path: imagePath } : {}),
        ...(forwarded ? { forwarded: 'true' } : {}),
        // ss: a transcribed note carries its words, not a file to download.
        ...(transcript ? { voice_transcript: 'true' } : {}),
        ...(attachment ? {
          attachment_kind: attachment.kind,
          ...(transcript ? {} : {
            attachment_file_id: attachment.file_id,
            ...(attachment.size != null ? { attachment_size: String(attachment.size) } : {}),
            ...(attachment.mime ? { attachment_mime: safeName(attachment.mime)! } : {}),
            ...(attachment.name ? { attachment_name: attachment.name } : {}),
          }),
        } : {}),
      },
    }
    companion.submit(chat_id, item)
  }

  // ss: Claude cannot listen to audio, so a voice note or audio file is
  // transcribed first when a transcriber is set up (transcribe.ts). That can
  // take a while, and grammy handles updates one at a time, so it runs off the
  // update queue: a permission tap or a text sent meanwhile is not held up.
  // The transcriber gets no token (transcribe.ts passes childEnv()).
  if (attachment && (attachment.kind === 'voice' || attachment.kind === 'audio')) {
    const typing = setInterval(() => void bot.api.sendChatAction(chat_id, 'typing').catch(() => {}), 4000)
    voiceQueue = voiceQueue.then(async () => {
      let words: string | undefined
      try {
        words = await transcribeAttachment(attachment, downloadToInbox)
      } catch (err) {
        process.stderr.write(`companion: voice download failed: ${err}\n`)
      } finally {
        clearInterval(typing)
      }
      const caption = ctx.message?.caption
      emit(words ? (caption ? `${caption}\n\n${words}` : words) : text, Boolean(words))
    }).catch(err => {
      // A failed note must not stop the ones queued after it.
      process.stderr.write(`companion: voice note failed: ${err}\n`)
    })
    return
  }

  emit(text, false)
}

// Without this, any throw in a message handler stops polling permanently
// (grammy's default error handler calls bot.stop() and rethrows).
bot.catch(err => {
  process.stderr.write(`companion: handler error (polling continues): ${err.error}\n`)
})

// Retry polling with backoff on any error. Previously only 409 was retried —
// a single ETIMEDOUT/ECONNRESET/DNS failure rejected bot.start(), the catch
// returned, and polling stopped permanently while the process stayed alive
// (the watch and the timers keep it running). The bot was deaf to inbound
// messages until a full restart.
void (async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      await bot.start({
        onStart: info => {
          attempt = 0
          botUsername = info.username
          process.stderr.write(`companion: polling as @${info.username}\n`)
          void bot.api.setMyCommands(
            [
              { command: 'start', description: 'Welcome and setup guide' },
              { command: 'help', description: 'What this bot can do' },
              { command: 'nova', description: 'Start a fresh conversation' },
              { command: 'status', description: 'Check your pairing status' },
            ],
            { scope: { type: 'all_private_chats' } },
          ).catch(() => {})
        },
      })
      return // bot.stop() was called — clean exit from the loop
    } catch (err) {
      if (shuttingDown) return
      // bot.stop() mid-setup rejects with grammy's "Aborted delay" — expected, not an error.
      if (err instanceof Error && err.message === 'Aborted delay') return
      const is409 = err instanceof GrammyError && err.error_code === 409
      if (is409 && attempt >= 8) {
        process.stderr.write(
          `companion: 409 Conflict persists after ${attempt} attempts — ` +
          `another poller is holding the bot token (a second companion, or a Claude Code session still running the old channel). Exiting.\n`,
        )
        // ss: a service exits non-zero, so a supervisor (systemd) can try again later.
        watch.stop()
        companion.stop()
        process.exit(1)
      }
      const delay = Math.min(1000 * attempt, 15000)
      const detail = is409
        ? `409 Conflict${attempt === 1 ? ' — another instance is polling (a second companion, or the old channel in a session?)' : ''}`
        : `polling error: ${err}`
      process.stderr.write(`companion: ${detail}, retrying in ${delay / 1000}s\n`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
})()
