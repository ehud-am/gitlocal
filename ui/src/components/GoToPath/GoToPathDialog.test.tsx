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

  describe('auto-complete', () => {
    const suggestions = [
      { value: 'src/', name: 'src', type: 'dir' as const },
      { value: 'scripts/', name: 'scripts', type: 'dir' as const },
      { value: 'setup.md', name: 'setup.md', type: 'file' as const },
    ]

    it('lists matches while typing and fills a folder with Tab, keeping the list on its contents', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn().mockResolvedValue(suggestions)
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={onComplete} />)

      const input = screen.getByRole('combobox', { name: 'Path to go to' })
      await user.type(input, 's')
      expect(await screen.findByRole('listbox', { name: 'Matching paths' })).toBeInTheDocument()
      expect(onComplete).toHaveBeenLastCalledWith('s')
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['src/', 'scripts/', 'setup.md'])
      expect(input).toHaveAttribute('aria-expanded', 'true')

      await user.keyboard('{Tab}')
      expect(input).toHaveValue('src/')
      await waitFor(() => expect(onComplete).toHaveBeenLastCalledWith('src/'))
    })

    it('moves the highlight with the arrow keys and accepts it with Enter instead of submitting', async () => {
      const user = userEvent.setup()
      const onGo = vi.fn().mockResolvedValue(null)
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={onGo} onComplete={vi.fn().mockResolvedValue(suggestions)} />)

      const input = screen.getByRole('combobox', { name: 'Path to go to' })
      await user.type(input, 's')
      await screen.findByRole('listbox')
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}')
      const options = screen.getAllByRole('option')
      expect(options[2]).toHaveAttribute('aria-selected', 'true')
      expect(input).toHaveAttribute('aria-activedescendant', 'go-to-path-option-2')
      await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}')
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
      await user.keyboard('{ArrowDown}')

      await user.keyboard('{Enter}')
      expect(input).toHaveValue('setup.md')
      expect(onGo).not.toHaveBeenCalled()
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

      await user.keyboard('{Enter}')
      expect(onGo).toHaveBeenCalledWith('setup.md')
    })

    it('accepts a suggestion on click', async () => {
      const user = userEvent.setup()
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={vi.fn().mockResolvedValue(suggestions)} />)

      await user.type(screen.getByRole('combobox'), 's')
      const option = await screen.findByRole('option', { name: 'setup.md' })
      await user.hover(option)
      expect(option).toHaveAttribute('aria-selected', 'true')
      await user.click(option)
      expect(screen.getByRole('combobox')).toHaveValue('setup.md')
    })

    it('closes the list on the first Escape and the dialog on the second', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<GoToPathDialog open rootPath="/r" onOpenChange={onOpenChange} onGo={vi.fn()} onComplete={vi.fn().mockResolvedValue(suggestions)} />)

      await user.type(screen.getByRole('combobox'), 's')
      await screen.findByRole('listbox')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(onOpenChange).not.toHaveBeenCalled()

      await user.keyboard('{Escape}')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('reopens the list with ArrowDown and hides it when the input loses focus', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn().mockResolvedValue(suggestions)
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={onComplete} />)

      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.keyboard('{ArrowDown}')
      expect(await screen.findByRole('listbox')).toBeInTheDocument()
      expect(onComplete).toHaveBeenLastCalledWith('')

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('shows no list when the completion source fails or finds nothing', async () => {
      const user = userEvent.setup()
      const onComplete = vi.fn().mockRejectedValue(new Error('offline'))
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={onComplete} />)

      await user.type(screen.getByRole('combobox'), 'x')
      await waitFor(() => expect(onComplete).toHaveBeenCalled())
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      await user.keyboard('{Tab}')
      expect(screen.getByRole('combobox')).toHaveValue('x')
    })

    it('ignores a slower, older completion answer once a newer one arrived', async () => {
      const user = userEvent.setup()
      let resolveFirst: (value: typeof suggestions) => void = () => {}
      const onComplete = vi.fn()
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
        .mockResolvedValue([suggestions[2]])
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={onComplete} />)

      const input = screen.getByRole('combobox')
      await user.type(input, 's')
      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
      await user.type(input, 'e')
      expect(await screen.findByRole('option', { name: 'setup.md' })).toBeInTheDocument()
      resolveFirst(suggestions)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(screen.getAllByRole('option')).toHaveLength(1)
    })

    it('ignores a failure from an older completion request', async () => {
      const user = userEvent.setup()
      let rejectFirst: (error: Error) => void = () => {}
      const onComplete = vi.fn()
        .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject }))
        .mockResolvedValue([suggestions[2]])
      render(<GoToPathDialog open rootPath="/r" onOpenChange={vi.fn()} onGo={vi.fn()} onComplete={onComplete} />)

      const input = screen.getByRole('combobox')
      await user.type(input, 's')
      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
      await user.type(input, 'e')
      expect(await screen.findByRole('option', { name: 'setup.md' })).toBeInTheDocument()
      rejectFirst(new Error('late'))
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(screen.getAllByRole('option')).toHaveLength(1)
    })
  })
})
