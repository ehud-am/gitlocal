import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './services/api'
import FileTree from './components/FileTree/FileTree'
import Breadcrumb from './components/Breadcrumb/Breadcrumb'
import ContentPanel from './components/ContentPanel/ContentPanel'
import GitInfo from './components/GitInfo/GitInfo'
import PickerPage from './components/Picker/PickerPage'

export default function App() {
  const [selectedFile, setSelectedFile] = useState('')
  const [currentBranch, setCurrentBranch] = useState('')
  const [readmeMissing, setReadmeMissing] = useState(false)

  const { data: info } = useQuery({
    queryKey: ['info'],
    queryFn: api.getInfo,
  })

  // Initialize branch from info
  React.useEffect(() => {
    if (info?.currentBranch && !currentBranch) {
      setCurrentBranch(info.currentBranch)
    }
  }, [info, currentBranch])

  // Auto-select README on first load (viewer mode only)
  React.useEffect(() => {
    if (!info || info.pickerMode || selectedFile) return
    api.getReadme()
      .then(({ path }) => {
        if (path) {
          setSelectedFile(path)
        } else {
          setReadmeMissing(true)
        }
      })
      .catch(() => {
        setReadmeMissing(true)
      })
  }, [info]) // eslint-disable-line react-hooks/exhaustive-deps

  // Picker mode: show the folder selector page
  if (info?.pickerMode) {
    return <PickerPage />
  }

  if (info && !info.isGitRepo) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>Not a Git repository</h2>
          <p>
            This folder is not a git repository. Please point GitLocal at a folder
            containing a <code>.git</code> directory.
          </p>
        </div>
      </div>
    )
  }

  const noReadmePlaceholder =
    readmeMissing && !selectedFile ? 'No README found in this repository.' : undefined

  return (
    <>
      <header className="app-header">
        <span className="logo">GitLocal</span>
        {info && <span className="repo-name">{info.name}</span>}
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <FileTree
            branch={currentBranch}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
          />
          <GitInfo
            branch={currentBranch}
            onBranchChange={setCurrentBranch}
          />
        </aside>
        <div className="content-area">
          <Breadcrumb
            path={selectedFile}
            onNavigate={(path) => {
              if (path === '') {
                setSelectedFile('')
              } else {
                setSelectedFile(path)
              }
            }}
          />
          <ContentPanel
            filePath={selectedFile}
            branch={currentBranch}
            onNavigate={setSelectedFile}
            placeholder={noReadmePlaceholder}
          />
        </div>
      </div>
    </>
  )
}
