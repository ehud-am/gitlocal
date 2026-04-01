interface Props {
  version: string
}

export default function AppFooter({ version }: Props) {
  const currentYear = new Date().getFullYear()

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
      <span>{`v${version}`}</span>
    </footer>
  )
}
