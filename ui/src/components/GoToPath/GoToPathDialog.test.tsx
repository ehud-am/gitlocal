import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GoToPathDialog from './GoToPathDialog'

describe('GoToPathDialog', () => {
  it('submits the typed path and closes once it opened', async () => {
    const user = userEvent.setup()
    const onGo = vi.fn().mockResolvedValue(null)
    const onOpenChange = vi.fn()
    render(<GoToPathDialog open rootPath="/Users/me/repo" onOpenChange={onOpenChange} onGo={onGo} />)

    expect(screen.getByText('/Users/me/repo')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Path to go to'), 'src/app.ts{Enter}')

    expect(onGo).toHaveBeenCalledWith('src/app.ts')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('shows the error the handler returns and stays open', async () => {
    const user = userEvent.setup()
    const onGo = vi.fn().mockResolvedValue('Nothing found at nope.')
    const onOpenChange = vi.fn()
    render(<GoToPathDialog open rootPath="" onOpenChange={onOpenChange} onGo={onGo} />)

    expect(screen.getByText('the open folder')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Path to go to'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing found at nope.')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('asks for a path instead of submitting blank input', async () => {
    const user = userEvent.setup()
    const onGo = vi.fn()
    render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={onGo} />)

    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a path to go to.')
    expect(onGo).not.toHaveBeenCalled()
  })

  it('closes from Cancel and clears its input when reopened', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = render(<GoToPathDialog open rootPath="/r" onOpenChange={onOpenChange} onGo={vi.fn()} />)

    await user.type(screen.getByLabelText('Path to go to'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender(<GoToPathDialog open={false} rootPath="/r" onOpenChange={onOpenChange} onGo={vi.fn()} />)
    rerender(<GoToPathDialog open rootPath="/r" onOpenChange={onOpenChange} onGo={vi.fn()} />)
    expect(screen.getByLabelText('Path to go to')).toHaveValue('')
  })
})
