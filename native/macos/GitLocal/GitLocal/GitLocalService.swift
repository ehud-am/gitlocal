import Foundation

enum GitLocalServiceError: LocalizedError {
    case missingRuntime(String)
    case missingCLI(String)
    case startupTimedOut
    case invalidServiceURL(String)
    case terminatedBeforeReady(String)

    var errorDescription: String? {
        switch self {
        case .missingRuntime(let path):
            return "GitLocal could not find the bundled Node runtime at \(path)."
        case .missingCLI(let path):
            return "GitLocal could not find the bundled service at \(path)."
        case .startupTimedOut:
            return "GitLocal could not start its local service before the startup timeout."
        case .invalidServiceURL(let value):
            return "GitLocal refused to load a non-local service URL: \(value)"
        case .terminatedBeforeReady(let output):
            return "GitLocal service exited before it was ready.\n\n\(output)"
        }
    }
}

final class GitLocalService {
    private var process: Process?
    private var outputPipe: Pipe?
    private var outputBuffer = ""
    private var completion: ((Result<URL, Error>) -> Void)?
    private var completed = false

    func start(completion: @escaping (Result<URL, Error>) -> Void) {
        self.completion = completion

        let paths = BundlePaths()
        guard FileManager.default.isExecutableFile(atPath: paths.nodeRuntime.path) else {
            finish(.failure(GitLocalServiceError.missingRuntime(paths.nodeRuntime.path)))
            return
        }
        guard FileManager.default.isReadableFile(atPath: paths.cliScript.path) else {
            finish(.failure(GitLocalServiceError.missingCLI(paths.cliScript.path)))
            return
        }

        let process = Process()
        process.executableURL = paths.nodeRuntime
        process.arguments = [paths.cliScript.path, "--app-mode"]
        process.currentDirectoryURL = FileManager.default.homeDirectoryForCurrentUser

        let pipe = Pipe()
        outputPipe = pipe
        process.standardOutput = pipe
        process.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self else { return }
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            self.outputBuffer += text
            self.handleOutput()
        }

        process.terminationHandler = { [weak self] _ in
            guard let self, !self.completed else { return }
            self.finish(.failure(GitLocalServiceError.terminatedBeforeReady(self.outputBuffer)))
        }

        do {
            try process.run()
            self.process = process
            DispatchQueue.global().asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self, !self.completed else { return }
                self.stop()
                self.finish(.failure(GitLocalServiceError.startupTimedOut))
            }
        } catch {
            finish(.failure(error))
        }
    }

    func stop() {
        guard let process else { return }
        if process.isRunning {
            process.terminate()
            DispatchQueue.global().asyncAfter(deadline: .now() + 1) {
                if process.isRunning {
                    process.interrupt()
                }
            }
        }
        self.process = nil
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        outputPipe = nil
    }

    private func handleOutput() {
        guard !completed else { return }
        let pattern = #"gitlocal listening on (http://[^\s]+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
        let range = NSRange(outputBuffer.startIndex..<outputBuffer.endIndex, in: outputBuffer)
        guard let match = regex.firstMatch(in: outputBuffer, range: range),
              let urlRange = Range(match.range(at: 1), in: outputBuffer) else {
            return
        }

        let urlText = String(outputBuffer[urlRange])
        guard let url = URL(string: urlText), isLoopback(url) else {
            finish(.failure(GitLocalServiceError.invalidServiceURL(urlText)))
            return
        }
        finish(.success(url))
    }

    private func isLoopback(_ url: URL) -> Bool {
        guard url.scheme == "http", let host = url.host?.lowercased() else {
            return false
        }
        return host == "localhost" || host == "127.0.0.1" || host == "::1"
    }

    private func finish(_ result: Result<URL, Error>) {
        guard !completed else { return }
        completed = true
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        completion?(result)
        completion = nil
    }
}
