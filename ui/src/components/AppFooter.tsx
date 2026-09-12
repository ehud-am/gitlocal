import { GitHubIcon, GlobeIcon } from './ui/icons'

interface Props {
  version: string
}

export default function AppFooter({ version }: Props) {
  const currentYear = new Date().getFullYear()
  const normalizedVersion = version.replace(/^v/i, '')

  return (
    <footer className="app-footer">
      <span className="app-footer-meta">{currentYear}</span>
      <a
        href="https://github.com/ehud-am/gitlocal"
        className="app-footer-link"
        target="_blank"
        rel="noreferrer"
      >
        <GitHubIcon />
        GitLocal
      </a>
      <a
        href="https://gitlocal.dev"
        className="app-footer-link"
        target="_blank"
        rel="noreferrer"
      >
        <GlobeIcon />
        gitlocal.dev
      </a>
      {normalizedVersion ? <span className="app-footer-meta">{`v${normalizedVersion}`}</span> : null}
    </footer>
  )
}
