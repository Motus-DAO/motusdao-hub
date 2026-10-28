'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileUp, MessageSquare, MessageSquarePlus, Server, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CTAButton } from '@/components/ui/CTAButton'
import { usePsychatArchiveKeyContext } from '@/components/psychat/PsychatArchiveKeyContext'
import { deletePsychatArchiveOnServer, fetchPsychatArchiveRow } from '@/lib/psychat-archive/client'
import { loadPsychatArchiveFromExportFile, loadPsychatArchiveFromServer } from '@/lib/psychat-archive/load-archive'
import { readPsychatArchiveExportFile } from '@/lib/psychat-archive/restore-from-export'
import { PSYCHAT_ARCHIVE_CHANGED_EVENT, psychatCopy } from '@/lib/psychat-archive/constants'
import type { PsychatArchiveMessage } from '@/lib/psychat-archive/payload'

type Props = {
  isSessionReady: boolean
  activeSessionLabel: string
  onOpenThread: (messages: PsychatArchiveMessage[], label: string) => void
  onNewChat: () => void
}

export function PsychatSessionsSidebar({
  isSessionReady,
  activeSessionLabel,
  onOpenThread,
  onNewChat,
}: Props) {
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null)
  const [loadingServer, setLoadingServer] = useState(false)
  const [deletingServer, setDeletingServer] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    eoaAddress,
    isUnlocked,
    unlock,
    state: keyState,
    unlockError,
    getKey,
  } = usePsychatArchiveKeyContext()

  const refreshServerMeta = useCallback(() => {
    if (!isSessionReady) {
      setServerUpdatedAt(null)
      return
    }
    void fetchPsychatArchiveRow()
      .then((row) => setServerUpdatedAt(row?.updatedAt ?? null))
      .catch(() => setServerUpdatedAt(null))
  }, [isSessionReady])

  useEffect(() => {
    refreshServerMeta()
  }, [refreshServerMeta, activeSessionLabel])

  useEffect(() => {
    const onArchiveChanged = () => refreshServerMeta()
    window.addEventListener(PSYCHAT_ARCHIVE_CHANGED_EVENT, onArchiveChanged)
    return () => window.removeEventListener(PSYCHAT_ARCHIVE_CHANGED_EVENT, onArchiveChanged)
  }, [refreshServerMeta])

  const openServerCopy = async () => {
    const key = getKey()
    if (!key || !eoaAddress) return
    setMenuError(null)
    setLoadingServer(true)
    try {
      const payload = await loadPsychatArchiveFromServer(eoaAddress, key)
      if (!payload?.messages.length) {
        setMenuError('No hay copia guardada en tu cuenta Motus.')
        refreshServerMeta()
        return
      }
      const label = `${psychatCopy.accountBackup} · ${new Date(payload.savedAt).toLocaleString()}`
      onOpenThread(payload.messages, label)
    } catch (e) {
      setMenuError(e instanceof Error ? e.message : 'No se pudo abrir la copia')
    } finally {
      setLoadingServer(false)
    }
  }

  const deleteServerCopy = async () => {
    if (deletingServer) return
    const ok = window.confirm(
      '¿Borrar la copia cifrada de tu cuenta Motus? El chat en pantalla no se borra; solo el respaldo en la nube. Puedes volver a guardar después.'
    )
    if (!ok) return
    setMenuError(null)
    setDeletingServer(true)
    try {
      await deletePsychatArchiveOnServer()
      setServerUpdatedAt(null)
    } catch (e) {
      setMenuError(e instanceof Error ? e.message : 'No se pudo borrar la copia')
    } finally {
      setDeletingServer(false)
    }
  }

  const openFromFile = async (file: File) => {
    const key = getKey()
    if (!key || !eoaAddress) return
    setMenuError(null)
    try {
      const exportFile = await readPsychatArchiveExportFile(file)
      const payload = await loadPsychatArchiveFromExportFile(exportFile, eoaAddress, key)
      if (!payload?.messages.length) {
        setMenuError('El archivo no trae mensajes.')
        return
      }
      onOpenThread(payload.messages, `Archivo ${file.name}`)
    } catch (e) {
      setMenuError(e instanceof Error ? e.message : 'No se pudo leer el archivo')
    }
  }

  const serverLabel = serverUpdatedAt
    ? `${psychatCopy.accountBackup} · ${new Date(serverUpdatedAt).toLocaleDateString()}`
    : null
  const isServerActive =
    serverLabel !== null && activeSessionLabel.startsWith(psychatCopy.accountBackup)

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col border-b border-border bg-muted/20 sm:w-56 sm:border-b-0 sm:border-r lg:w-60',
        'sm:min-h-[calc(100dvh-8rem)] sm:max-h-[calc(100dvh-8rem)] sm:overflow-y-auto'
      )}
    >
      <div className="border-b border-border px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Psychat</p>
        <p className="text-sm font-medium text-foreground truncate" title={activeSessionLabel}>
          Chats y copias
        </p>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{psychatCopy.notAnotherWebsite}</p>
      </div>

      {!isSessionReady ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          Entra con wallet y sesión para ver copias guardadas.
        </p>
      ) : (
        <nav className="flex flex-col gap-1 p-2 text-sm">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-foreground hover:bg-foreground/5 transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0 text-mauve-400" />
            <span>Nuevo chat</span>
          </button>

          <div className="px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            En pantalla
          </div>
          <div
            className="flex items-start gap-2 rounded-lg bg-mauve-500/15 px-3 py-2 text-foreground"
          >
            <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2 text-xs leading-snug">{activeSessionLabel}</span>
          </div>

          <div className="px-2 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Copias para abrir
          </div>
          <p className="px-3 pb-1 text-[10px] leading-snug text-muted-foreground">
            {psychatCopy.singleAccountSnapshotHint}
          </p>

          {!isUnlocked ? (
            <div className="space-y-2 px-1">
              <p className="text-xs text-muted-foreground px-2">
                Firma para desbloquear copias cifradas (llave del archivo Psychat).
              </p>
              {unlockError && <p className="text-xs text-red-400 px-2">{unlockError}</p>}
              <CTAButton
                type="button"
                size="sm"
                className="w-full"
                disabled={keyState === 'unlocking'}
                onClick={() => void unlock()}
              >
                {keyState === 'unlocking' ? 'Esperando firma…' : 'Desbloquear'}
              </CTAButton>
            </div>
          ) : (
            <>
              {serverUpdatedAt ? (
                <div
                  className={cn(
                    'flex items-stretch gap-0.5 rounded-lg',
                    isServerActive && 'bg-mauve-500/15'
                  )}
                >
                  <button
                    type="button"
                    disabled={loadingServer || deletingServer}
                    onClick={() => void openServerCopy()}
                    className={cn(
                      'flex min-w-0 flex-1 items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/5',
                      isServerActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Server className="h-4 w-4 shrink-0 mt-0.5 text-mauve-400" />
                    <span className="text-xs leading-snug">
                      {loadingServer ? 'Abriendo…' : serverLabel}
                      <span className="block text-[10px] opacity-80">
                        {new Date(serverUpdatedAt).toLocaleTimeString()}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    title={psychatCopy.deleteAccountBackup}
                    aria-label={psychatCopy.deleteAccountBackup}
                    disabled={loadingServer || deletingServer}
                    onClick={() => void deleteServerCopy()}
                    className="shrink-0 rounded-lg px-2 py-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="px-3 py-1 text-xs text-muted-foreground">{psychatCopy.noAccountBackup}</p>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void openFromFile(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/5',
                  activeSessionLabel.startsWith('Archivo ')
                    ? 'bg-mauve-500/15 text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <FileUp className="h-4 w-4 shrink-0" />
                <span className="text-xs">Abrir .json local</span>
              </button>
            </>
          )}

          <Link
            href="/psychat/archivo/recuperar"
            className="mt-2 px-3 py-2 text-xs text-mauve-400 hover:underline"
          >
            {psychatCopy.recoverFromJson} →
          </Link>
          <Link href="/psychat/archivo" className="px-3 py-1 text-xs text-muted-foreground hover:underline">
            ¿Cómo funciona?
          </Link>

          {menuError && <p className="px-3 text-xs text-red-400">{menuError}</p>}
        </nav>
      )}
    </aside>
  )
}
