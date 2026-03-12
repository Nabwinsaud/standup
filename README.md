# standup

[![CI](https://github.com/Nabwinsaud/standup/actions/workflows/ci.yml/badge.svg)](https://github.com/Nabwinsaud/standup/actions/workflows/ci.yml)
[![Release](https://github.com/Nabwinsaud/standup/actions/workflows/release.yml/badge.svg)](https://github.com/Nabwinsaud/standup/actions/workflows/release.yml)

Pull your git commits, shape them into a beautiful standup report -- right from your terminal.

Supports multiple repos, date ranges, markdown/JSON export, clipboard copy, and optional AI-powered summaries via OpenAI.

---

## Install

### Quick install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/Nabwinsaud/standup/main/install.sh | bash
```

This clones the repo, installs [Bun](https://bun.sh) if needed, and symlinks `standup` into `~/.local/bin`.

### Download a prebuilt binary

Grab the latest binary from the [Releases](https://github.com/Nabwinsaud/standup/releases) page for your platform:

| Platform | Binary |
| --- | --- |
| macOS (Apple Silicon) | `standup-darwin-arm64` |
| macOS (Intel) | `standup-darwin-x64` |
| Linux (x64) | `standup-linux-x64` |
| Linux (ARM64) | `standup-linux-arm64` |
| Windows (x64) | `standup-windows-x64.exe` |

```bash
# Example: macOS Apple Silicon
curl -fSL https://github.com/Nabwinsaud/standup/releases/latest/download/standup-darwin-arm64 -o standup
chmod +x standup
sudo mv standup /usr/local/bin/
```

### From source

Requires [Bun](https://bun.sh) v1.1+.

```bash
git clone https://github.com/Nabwinsaud/standup.git
cd standup
bun install
bun link          # makes `standup` available globally
```

---

## Usage

```bash
standup                    # yesterday's commits (default)
standup --today            # today's commits
standup --yesterday        # explicitly yesterday
standup --week             # this week's commits
standup --since "3 days ago"   # custom date range
standup --since 2025-01-01 --until 2025-01-31
```

### Output formats

```bash
standup              # colored terminal output (default)
standup --md         # raw markdown
standup --json       # structured JSON
standup --no-color   # plain text, no ANSI codes
```

### AI summaries

Generate a polished, PM-friendly standup summary using OpenAI:

```bash
standup --ai                      # AI summary (professional tone)
standup --ai --tone casual        # casual tone
standup --ai --tone bullet-points # bullet-point style
standup --ai --md                 # AI summary as markdown
```

Set your API key via environment variable or config:

```bash
export OPENAI_API_KEY="sk-..."
```

### Copy and export

```bash
standup --copy          # copy report to clipboard
standup --export        # save as standup-YYYY-MM-DD.md
standup --ai --export   # AI summary saved to file
```

### Multi-repo support

Register repos for combined standup reports:

```bash
standup add /path/to/repo-a
standup add /path/to/repo-b
standup --all                 # scan all registered repos
standup list                  # list registered repos
standup remove /path/to/repo-a
```

### Target a specific repo

```bash
standup --repo /path/to/other-project
```

### Filter by author

```bash
standup --author "Jane Dev"
```

---

## Configuration

Standup stores config in `~/.standup/config.toml`. Open it with:

```bash
standup config
```

Example config:

```toml
[user]
name = "Jane Dev"
email = "jane@example.com"

[repos]
paths = [
  "/home/jane/projects/api",
  "/home/jane/projects/frontend",
]

[report]
default_range = "yesterday"  # "today", "yesterday", "week"

[display]
show_hash = true
show_branch = true
emoji = true

[ai]
provider = "openai"
api_key = "sk-..."
model = "gpt-4o-mini"
tone = "professional"  # "professional", "casual", "bullet-points"
```

---

## CI / CD

This project uses GitHub Actions for continuous integration and automated releases.

### CI (`.github/workflows/ci.yml`)

Runs on every push to `main` and on all pull requests:

- Installs dependencies with `bun install --frozen-lockfile`
- Type checks with `tsc --noEmit`
- Runs the full test suite with `bun test`
- Verifies the binary compiles successfully

### Release (`.github/workflows/release.yml`)

Triggered by pushing a `v*` git tag. Builds standalone binaries for **all 5 platforms**, generates SHA256 checksums, and publishes a GitHub Release with every artifact attached.

### Creating a release

```bash
# Bump version, create git tag, push -- triggers the release workflow
bun run release:patch    # 1.0.0 → 1.0.1
bun run release:minor    # 1.0.0 → 1.1.0
bun run release:major    # 1.0.0 → 2.0.0

# Or manually:
git tag v1.2.0
git push origin v1.2.0
```

The release workflow will:

1. Run tests and type checks
2. Build binaries for macOS (ARM64 + x64), Linux (ARM64 + x64), and Windows (x64)
3. Generate SHA256 checksums for each binary
4. Create a GitHub Release with all artifacts and install instructions

---

## Build locally

```bash
bun run build              # all 5 platform binaries → dist/
bun run build:current      # binary for your current machine
bun run build:mac-arm      # macOS Apple Silicon
bun run build:mac-intel    # macOS Intel
bun run build:linux        # Linux x64
bun run build:linux-arm    # Linux ARM64
bun run build:windows      # Windows x64
```

Binaries are self-contained executables -- no Bun or Node.js required on the target machine.

---

## Testing

```bash
bun test
```

Tests cover config merging, date utilities, emoji mapping, report rendering (markdown + plain text), and AI renderers.

---

## License

MIT
