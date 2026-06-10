# Claude Code Setup

## Session initialization

Run these commands at the start of every session to ensure commits are attributed correctly:

```bash
git config user.email "mitsumira@users.noreply.github.com"
git config user.name "MitsuMira"
cat > .git/commit-template.txt << 'EOF'


Co-authored-by: Claude <claude@anthropic.com>
EOF
git config commit.template .git/commit-template.txt
```

This ensures:
- Commits count toward the GitHub contribution graph
- Every commit shows Claude as co-author (collaboration credit)
