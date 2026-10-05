import path from 'node:path'
import ts from 'typescript'

const upstream = process.env.DSH_BITES_TYPECHECK_ROOT || process.env.DSH_BITES_UPSTREAM_ROOT
if (!upstream) {
  console.log('Upstream typecheck: DSH_BITES_UPSTREAM_ROOT is unset; using the normal pinned typecheck.')
} else {
  const root = path.resolve(import.meta.dirname, '..')
  const config = ts.readConfigFile(path.join(root, 'tsconfig.client.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const host = ts.createCompilerHost(parsed.options)
  host.resolveModuleNames = (names, containingFile) => names.map(name =>
    ts.resolveModuleName(name, name.startsWith('@deepseek-ai/') && path.resolve(upstream) !== root ? path.join(upstream, 'probe.ts') : containingFile, parsed.options, host).resolvedModule)
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true }, host)
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
  console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
  }))
  console.log(`Upstream typecheck: ${diagnostics.length} diagnostics`)
  process.exitCode = diagnostics.length ? 1 : 0
}
