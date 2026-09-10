interface Props {
  version: string
}

export default function AppFooter({ version }: Props) {
  const currentYear = new Date().getFullYear()
  const normalizedVersion = version.replace(/^v/i, '')

  return (
    <footer className="app-footer">
      <span>{currentYear}</span>
      <a
        href="https://github.com/ehud-am/gitlocal"
        className="app-footer-link"
        target="_blank"
        rel="noreferrer"
      >
        GitLocal
      </a>
      <a
        href="https://gitlocal.dev"
        className="app-footer-link"
        target="_blank"
        rel="noreferrer"
      >
        gitlocal.dev
      </a>
      {normalizedVersion ? <span>{`v${normalizedVersion}`}</span> : null}
    </footer>
  )
}
