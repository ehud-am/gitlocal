import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { Commit } from '../../types'

interface Props {
  branch: string
  onBranchChange: (name: string) => void
}

function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString()
}

function CommitRow({ commit }: { commit: Commit }) {
  return (
    <li className="commit-item">
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span className="commit-hash">{commit.shortHash}</span>
        <span className="commit-author">{commit.author}</span>
        <span className="commit-author" style={{ marginLeft: 'auto' }}>{relativeDate(commit.date)}</span>
      </div>
      <div className="commit-message" title={commit.message}>{commit.message}</div>
    </li>
  )
}

export default function GitInfo({ branch, onBranchChange }: Props) {
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: api.getBranches,
  })

  const { data: commits } = useQuery({
    queryKey: ['commits', branch],
    queryFn: () => api.getCommits(branch, 10),
    enabled: !!branch,
  })

  return (
    <div className="git-info">
      <div className="git-info-header">
        <span>Branch</span>
        <select
          className="branch-select"
          value={branch}
          onChange={e => onBranchChange(e.target.value)}
          aria-label="branch selector"
        >
          {branches?.map(b => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>
      {commits && commits.length > 0 && (
        <ul className="commit-list" aria-label="recent commits">
          {commits.map(c => (
            <CommitRow key={c.hash} commit={c} />
          ))}
        </ul>
      )}
    </div>
  )
}
