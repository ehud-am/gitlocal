import { useEffect, useRef, useState } from 'react'
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
import { FileTabIcon, FolderTabIcon } from '../ui/icons'
import type { PathCompletion } from '../../types'

interface GoToPathDialogProps {
  open: boolean
  rootPath: string
  onOpenChange: (open: boolean) => void
  // Resolves to an error message to show in the dialog, or null once the path was opened.
  onGo: (input: string) => Promise<string | null>
  // Folder and file names that complete the typed path (#134). Optional so the dialog still works
  // without a completion source.
  onComplete?: (input: string) => Promise<PathCompletion[]>
}

export const COMPLETION_DELAY_MS = 120

// "Go to path" from any page (#118): the folder picker's path box, available everywhere.
// Typing lists matching files and folders under the input. Up/Down picks one, Tab or Enter puts
// it in the input (a folder keeps the list open on its contents), Escape closes the list first.
export default function GoToPathDialog({ open, rootPath, onOpenChange, onGo, onComplete }: GoToPathDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [suggestions, setSuggestions] = useState<PathCompletion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [listOpen, setListOpen] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!open) return
    setValue('')
    setError('')
    setPending(false)
    setSuggestions([])
    setActiveIndex(-1)
    setListOpen(false)
  }, [open])

  useEffect(() => {
    if (!open || !onComplete || !listOpen) return
    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(() => {
      Promise.resolve()
        .then(() => onComplete(value))
        .then((next) => {
          if (requestId !== requestIdRef.current) return
          setSuggestions(next)
          setActiveIndex(-1)
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return
          setSuggestions([])
        })
    }, COMPLETION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [listOpen, onComplete, open, value])

  const showList = listOpen && suggestions.length > 0

  function acceptSuggestion(suggestion: PathCompletion) {
    setValue(suggestion.value)
    setError('')
    setActiveIndex(-1)
    // A folder keeps the list open on its contents; a file is the end of the path.
    setListOpen(suggestion.type === 'dir')
    if (suggestion.type !== 'dir') setSuggestions([])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (event.key === 'ArrowDown' && onComplete) {
        event.preventDefault()
        setListOpen(true)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      acceptSuggestion(suggestions[activeIndex >= 0 ? activeIndex : 0])
      return
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      acceptSuggestion(suggestions[activeIndex])
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim()) {
      setError('Enter a path to go to.')
      return
    }
    setPending(true)
    setError('')
    setListOpen(false)
    const message = await onGo(value)
    setPending(false)
    if (message) {
      setError(message)
      return
    }
    onOpenChange(false)
  }

  const activeId = showList && activeIndex >= 0 ? `go-to-path-option-${activeIndex}` : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,560px)]"
        onEscapeKeyDown={(event) => {
          // With the list open, Escape closes only the list; a second Escape closes the dialog.
          if (!showList) return
          event.preventDefault()
          setListOpen(false)
        }}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Go to path</DialogTitle>
            <DialogDescription>
              Enter a path relative to <code className="break-all">{rootPath || 'the open folder'}</code>, or an absolute path such as <code>~/notes</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="go-to-path-field">
            <Input
              autoFocus
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                if (onComplete) setListOpen(true)
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setListOpen(false)}
              placeholder="src/index.ts"
              aria-label="Path to go to"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showList}
              aria-controls="go-to-path-options"
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={pending}
            />
            {showList ? (
              <ul id="go-to-path-options" role="listbox" aria-label="Matching paths" className="go-to-path-options">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.value}
                    id={`go-to-path-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? 'go-to-path-option is-active' : 'go-to-path-option'}
                    // mousedown, not click: the input's blur would close the list before a click lands.
                    onMouseDown={(event) => {
                      event.preventDefault()
                      acceptSuggestion(suggestion)
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {suggestion.type === 'dir' ? <FolderTabIcon /> : <FileTabIcon />}
                    <span className="go-to-path-option-name">{suggestion.name}{suggestion.type === 'dir' ? '/' : ''}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
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
