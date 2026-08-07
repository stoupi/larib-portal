const SOURCE_DIRECTORIES = ['actions', 'app', 'components', 'lib', 'messages', 'prisma', 'scripts', 'types']

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.prisma']

export function isSourcePath(candidate: string): boolean {
  const insideSourceDirectory = SOURCE_DIRECTORIES.some((directory) => candidate.startsWith(`${directory}/`))
  if (!insideSourceDirectory) return false
  return SOURCE_EXTENSIONS.some((extension) => candidate.endsWith(extension))
}

// A local build compiles the working tree, so a source file that was never
// staged still resolves here and only breaks once Vercel clones from GitHub.
export function findUntrackedSources(untrackedPaths: string[]): string[] {
  return untrackedPaths
    .map((untrackedPath) => untrackedPath.trim())
    .filter((untrackedPath) => untrackedPath.length > 0)
    .filter(isSourcePath)
    .sort()
}
