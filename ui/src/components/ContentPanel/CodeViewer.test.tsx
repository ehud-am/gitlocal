import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CodeViewer from './CodeViewer'

describe('CodeViewer', () => {
  it('renders a left gutter with line numbers for code content', () => {
    render(<CodeViewer content={'const answer = 42\nconsole.log(answer)'} language="typescript" />)

    const gutter = screen.getByTestId('line-number-gutter')
    expect(gutter).toHaveTextContent('1')
    expect(gutter).toHaveTextContent('2')
    expect(
      screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
        && element.textContent?.includes('const answer = 42') === true),
    ).toBeInTheDocument()
  })

  it('counts trailing blank lines in the rendered gutter', () => {
    render(<CodeViewer content={'line 1\n'} language="" />)

    const gutter = screen.getByTestId('line-number-gutter')
    expect(gutter.querySelectorAll('.code-line-number')).toHaveLength(2)
  })
})
