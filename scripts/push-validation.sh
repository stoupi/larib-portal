#!/bin/sh
# Shared by .githooks/pre-push and the last step of `npm run verify:push`, so a
# manual `verify:push` and a hook-triggered one record the same cache entry —
# whichever runs first, the other reuses its result instead of re-running.
set -e

hash_stdin() {
	if command -v shasum >/dev/null 2>&1; then
		shasum -a 256 | cut -d' ' -f1
	else
		sha256sum | cut -d' ' -f1
	fi
}

# Everything the validation actually reads: the committed tree, the pending edits
# on tracked files, and the untracked sources the production build would miss.
fingerprint() {
	{
		git rev-parse "HEAD^{tree}"
		git diff HEAD
		git ls-files --others --exclude-standard -z | tr '\0' '\n' | while IFS= read -r file; do
			[ -f "$file" ] || continue
			printf '%s ' "$file"
			hash_stdin < "$file"
		done
	} | hash_stdin
}

passed_marker() { git rev-parse --git-path agent-push-validation-passed; }
failed_marker() { git rev-parse --git-path agent-push-validation-failed; }

case "$1" in
	fingerprint)
		fingerprint
		;;
	is-cached)
		marker="$(passed_marker)"
		[ -f "$marker" ] && [ "$(cat "$marker")" = "$(fingerprint)" ]
		;;
	record-pass)
		fingerprint > "$(passed_marker)"
		rm -f "$(failed_marker)"
		;;
	record-fail)
		printf 'validation_failed_at=%s\nhead=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(git rev-parse HEAD)" > "$(failed_marker)"
		;;
	*)
		echo "usage: push-validation.sh {fingerprint|is-cached|record-pass|record-fail}" >&2
		exit 2
		;;
esac
