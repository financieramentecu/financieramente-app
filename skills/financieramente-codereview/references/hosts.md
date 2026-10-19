# Hosts

This repo lives on GitHub. Use the `gh` CLI (already permitted for this project) — never a raw API call unless `gh` can't do it.

## Identify the PR

- From a URL `https://github.com/<owner>/<repo>/pull/<n>`: owner/repo/number parse directly.
- From just a number: `gh pr view <n> --json title,body,baseRefName,headRefName,url,number`

## Metadata

```bash
gh pr view <n> --json title,body,baseRefName,headRefName,url
```

## Diff against the real base (never assume main/develop)

```bash
gh pr diff <n>
```

Fallback if `gh pr diff` is unavailable and the workspace is this repo:

```bash
git fetch origin <base> <head>
git diff origin/<base>...origin/<head>   # three dots: only what head adds on top of base
```

## Comments (only after explicit user acceptance)

One inline comment per Crítico/Alto finding, anchored to file + diff line:

```bash
gh api repos/<owner>/<repo>/pulls/<n>/comments \
  -f body="<finding body>" \
  -f commit_id="<head_sha>" \
  -f path="<file>" \
  -F line=<line>
```

`<head_sha>`: `gh pr view <n> --json headRefOid -q .headRefOid`.

If the line isn't part of the diff, fall back to a general PR comment:

```bash
gh pr comment <n> --body "<finding body>"
```

Never use `gh pr review --approve` or `--request-changes` — comment only, per the skill's hard rules.
