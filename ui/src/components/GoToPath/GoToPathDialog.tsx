import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

interface GoToPathDialogProps {
  open: boolean
  rootPath: string
  onOpenChange: (open: boolean) => void
  // Resolves to an error message to show in the dialog, or null once the path was opened.
  onGo: (input: string) => Promise<string | null>
}

// "Go to path" from any page (#118): the folder picker's path box, available everywhere.
export default function GoToPathDialog({ open, rootPath, onOpenChange, onGo }: GoToPathDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setValue('')
    setError('')
    setPending(false)
  }, [open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim()) {
      setError('Enter a path to go to.')
      return
    }
    setPending(true)
    setError('')
    const message = await onGo(value)
    setPending(false)
    if (message) {
      setError(message)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,560px)]">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Go to path</DialogTitle>
            <DialogDescription>
              Enter a path relative to <code className="break-all">{rootPath || 'the open folder'}</code>, or an absolute path such as <code>~/notes</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="src/index.ts"
            aria-label="Path to go to"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={pending}
          />
          {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Opening...' : 'Go'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
