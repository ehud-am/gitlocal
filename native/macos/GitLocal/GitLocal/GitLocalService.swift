import Darwin
import Foundation

enum GitLocalServiceError: LocalizedError {
    case missingBundleResources
    case missingRuntime(String)
    case missingCLI(String)
    case startupTimedOut
    case invalidServiceURL(String)
    case terminatedBeforeReady(String)

    var errorDescription: String? {
        switch self {
        case .missingBundleResources:
            return "GitLocal could not locate its app bundle resources."
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
    // NM-001: guards `completed` (and the check-then-set around it), since it is read/written
    // from the readability handler, the termination handler, and the startup-timeout closure,
    // each of which can run concurrently on different GCD queues.
    private let completionStateQueue = DispatchQueue(label: "com.gitlocal.GitLocalService.completionState")
    private var completed = false

    func start(openPath: String? = nil, completion: @escaping (Result<URL, Error>) -> Void) {
        self.completion = completion

        guard let paths = BundlePaths() else {
            finish(.failure(GitLocalServiceError.missingBundleResources))
            return
        }
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
        process.arguments = [paths.cliScript.path, "--app-mode"] + (openPath.map { [$0] } ?? [])
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
            guard let self else { return }
            // `finish` itself performs the atomic check-then-set on `completionStateQueue`, so
            // the only responsibility here is to avoid running the (non-idempotent) `stop()`/
            // cleanup path when we're already done.
            self.finish(.failure(GitLocalServiceError.terminatedBeforeReady(self.outputBuffer)))
        }

        do {
            try process.run()
            self.process = process
            DispatchQueue.global().asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self else { return }
                guard self.markCompletedIfNeeded() else { return }
                self.stop()
                self.finishAlreadyMarkedCompleted(.failure(GitLocalServiceError.startupTimedOut))
            }
        } catch {
            finish(.failure(error))
        }
    }

    func stop() {
        guard let process else { return }
        if process.isRunning {
            process.terminate()
            if !waitUntilExited(process, timeout: 1.0) {
                process.interrupt()
                if !waitUntilExited(process, timeout: 1.0) {
                    kill(process.processIdentifier, SIGKILL)
                    _ = waitUntilExited(process, timeout: 1.0)
                }
            }
        }
        self.process = nil
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        outputPipe = nil
    }

    /// Blocks the calling thread, polling `process.isRunning`, until the process exits or
    /// `timeout` elapses. Used by `stop()` to synchronously escalate SIGTERM -> SIGINT -> SIGKILL
    /// so cleanup is guaranteed to complete before callers like `applicationWillTerminate` return.
    private func waitUntilExited(_ process: Process, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while process.isRunning && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.05)
        }
        return !process.isRunning
    }

    // Compiled once with `try!`: the pattern is a fixed literal that cannot fail to compile, so a
    // failure here means the literal itself was edited incorrectly — fail loudly at first use
    // rather than silently returning and leaving the 10s startup timer as the only diagnostic.
    private static let listeningURLRegex = try! NSRegularExpression(pattern: #"gitlocal listening on (http://[^\s]+)"#)

    private func handleOutput() {
        guard !completionStateQueue.sync(execute: { completed }) else { return }
        let regex = Self.listeningURLRegex
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

    /// Atomically checks `completed` and, if not already set, marks it `true`. Returns whether
    /// this call was the one that transitioned it (i.e. whether the caller now owns finishing).
    private func markCompletedIfNeeded() -> Bool {
        completionStateQueue.sync {
            guard !completed else { return false }
            completed = true
            return true
        }
    }

    private func finish(_ result: Result<URL, Error>) {
        guard markCompletedIfNeeded() else { return }
        finishAlreadyMarkedCompleted(result)
    }

    /// Runs the completion side effects. Callers must have already won the atomic transition via
    /// `markCompletedIfNeeded()` (directly or through `finish`).
    private func finishAlreadyMarkedCompleted(_ result: Result<URL, Error>) {
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        completion?(result)
        completion = nil
    }
}
