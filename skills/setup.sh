#!/bin/bash
# Setup AI Skills for development
# Configures AI coding assistants that follow agentskills.io standard:
#   - Claude Code: .claude/skills/ symlink + CLAUDE.md copies
#   - Cursor Code: .cursor/skills/ symlink + AGENTS.md copies
#   - Gemini CLI: .gemini/skills/ symlink + GEMINI.md copies
#   - Codex (OpenAI): .codex/skills/ symlink + AGENTS.md (native)
#   - GitHub Copilot: .github/copilot-instructions.md copy
#
# Usage:
#   ./setup.sh              # Interactive mode (select AI assistants)
#   ./setup.sh --all        # Configure all AI assistants
#   ./setup.sh --claude     # Configure only Claude Code
#   ./setup.sh --claude --codex  # Configure multiple

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_SOURCE="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Selection flags
SETUP_CLAUDE=false
SETUP_GEMINI=false
SETUP_CODEX=false
SETUP_COPILOT=false
SETUP_CURSOR=false

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Portable echo with escape sequences (replaces echo -e)
echo_e() {
    printf '%b\n' "$*"
}

# Portable echo -n with escape sequences (replaces echo -en)
echo_en() {
    printf '%b' "$*"
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Configure AI coding assistants for development."
    echo ""
    echo "Options:"
    echo "  --all       Configure all AI assistants"
    echo "  --claude    Configure Claude Code"
    echo "  --gemini    Configure Gemini CLI"
    echo "  --codex     Configure Codex (OpenAI)"
    echo "  --copilot   Configure GitHub Copilot"
    echo "  --cursor    Configure Cursor Code"
    echo "  --help      Show this help message"
    echo ""
    echo "If no options provided, runs in interactive mode."
    echo ""
    echo "Examples:"
    echo "  $0                      # Interactive selection"
    echo "  $0 --all                # All AI assistants"
    echo "  $0 --claude --codex     # Only Claude and Codex"
}

show_menu() {
    echo_e "${BOLD}Which AI assistants do you use?${NC}"
    echo_e "${CYAN}(Use numbers to toggle, Enter to confirm)${NC}"
    echo ""

    local options=("Claude Code" "Gemini CLI" "Codex (OpenAI)" "GitHub Copilot" "Cursor Code")
    local selected=(true false false false false)  # Claude selected by default (5 elements)

    while true; do
        for i in "${!options[@]}"; do
            if [ "${selected[$i]}" = true ]; then
                echo_e "  ${GREEN}[x]${NC} $((i+1)). ${options[$i]}"
            else
                echo_e "  [ ] $((i+1)). ${options[$i]}"
            fi
        done
        echo ""
        echo_e "  ${YELLOW}a${NC}. Select all"
        echo_e "  ${YELLOW}n${NC}. Select none"
        echo ""
        echo -n "Toggle (1-5, a, n) or Enter to confirm: "

        read -r choice

        case $choice in
            1) selected[0]=$([ "${selected[0]}" = true ] && echo false || echo true) ;;
            2) selected[1]=$([ "${selected[1]}" = true ] && echo false || echo true) ;;
            3) selected[2]=$([ "${selected[2]}" = true ] && echo false || echo true) ;;
            4) selected[3]=$([ "${selected[3]}" = true ] && echo false || echo true) ;;
            5) selected[4]=$([ "${selected[4]}" = true ] && echo false || echo true) ;;
            a|A) selected=(true true true true true) ;;
            n|N) selected=(false false false false false) ;;
            "") break ;;
            *) echo_e "${RED}Invalid option${NC}" ;;
        esac

        # Move cursor up to redraw menu (5 options + 2 separator lines + 2 action lines + 1 prompt = 11 lines)
        echo_en "\033[11A\033[J"
    done

    SETUP_CLAUDE=${selected[0]}
    SETUP_GEMINI=${selected[1]}
    SETUP_CODEX=${selected[2]}
    SETUP_COPILOT=${selected[3]}
    SETUP_CURSOR=${selected[4]}
}

setup_claude() {
    local target="$REPO_ROOT/.claude/skills"

    if [ ! -d "$REPO_ROOT/.claude" ]; then
        mkdir -p "$REPO_ROOT/.claude"
    fi

    if [ -L "$target" ]; then
        rm "$target"
    elif [ -d "$target" ]; then
        mv "$target" "$REPO_ROOT/.claude/skills.backup.$(date +%s)"
    fi

    ln -s "$SKILLS_SOURCE" "$target"
    echo_e "${GREEN}  ✓ .claude/skills -> skills/${NC}"

    # Copy AGENTS.md to CLAUDE.md
    copy_agents_md "CLAUDE.md"
}

setup_gemini() {
    local target="$REPO_ROOT/.gemini/skills"

    if [ ! -d "$REPO_ROOT/.gemini" ]; then
        mkdir -p "$REPO_ROOT/.gemini"
    fi

    if [ -L "$target" ]; then
        rm "$target"
    elif [ -d "$target" ]; then
        mv "$target" "$REPO_ROOT/.gemini/skills.backup.$(date +%s)"
    fi

    ln -s "$SKILLS_SOURCE" "$target"
    echo_e "${GREEN}  ✓ .gemini/skills -> skills/${NC}"

    # Copy AGENTS.md to GEMINI.md
    copy_agents_md "GEMINI.md"
}

setup_codex() {
    local target="$REPO_ROOT/.codex/skills"

    if [ ! -d "$REPO_ROOT/.codex" ]; then
        mkdir -p "$REPO_ROOT/.codex"
    fi

    if [ -L "$target" ]; then
        rm "$target"
    elif [ -d "$target" ]; then
        mv "$target" "$REPO_ROOT/.codex/skills.backup.$(date +%s)"
    fi

    ln -s "$SKILLS_SOURCE" "$target"
    echo_e "${GREEN}  ✓ .codex/skills -> skills/${NC}"
    echo_e "${GREEN}  ✓ Codex uses AGENTS.md natively${NC}"
}

setup_copilot() {
    if [ -f "$REPO_ROOT/AGENTS.md" ]; then
        mkdir -p "$REPO_ROOT/.github"
        cp "$REPO_ROOT/AGENTS.md" "$REPO_ROOT/.github/copilot-instructions.md"
        echo_e "${GREEN}  ✓ AGENTS.md -> .github/copilot-instructions.md${NC}"
    fi
}

copy_agents_md() {
    local target_name="$1"
    local agents_files
    local count=0

    agents_files=$(find "$REPO_ROOT" -name "AGENTS.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)

    for agents_file in $agents_files; do
        local agents_dir
        agents_dir=$(dirname "$agents_file")
        cp "$agents_file" "$agents_dir/$target_name"
        count=$((count + 1))
    done

    echo_e "${GREEN}  ✓ Copied $count AGENTS.md -> $target_name${NC}"
}

setup_cursor() {
    local target="$REPO_ROOT/.cursor/skills"

    if [ ! -d "$REPO_ROOT/.cursor" ]; then
        mkdir -p "$REPO_ROOT/.cursor"
    fi

    if [ -L "$target" ]; then
        rm "$target"
    elif [ -d "$target" ]; then
        mv "$target" "$REPO_ROOT/.cursor/skills.backup.$(date +%s)"
    fi

    ln -s "$SKILLS_SOURCE" "$target"
    echo_e "${GREEN}  ✓ .cursor/skills -> skills/${NC}"
}
# =============================================================================
# PARSE ARGUMENTS
# =============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            SETUP_CLAUDE=true
            SETUP_GEMINI=true
            SETUP_CODEX=true
            SETUP_COPILOT=true
            SETUP_CURSOR=true
            shift
            ;;
        --claude)
            SETUP_CLAUDE=true
            shift
            ;;
        --gemini)
            SETUP_GEMINI=true
            shift
            ;;
        --codex)
            SETUP_CODEX=true
            shift
            ;;
        --copilot)
            SETUP_COPILOT=true
            shift
            ;;
        --cursor)
            SETUP_CURSOR=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo_e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# =============================================================================
# MAIN
# =============================================================================

echo "🤖 AI Skills Setup"
echo "=========================="
echo ""

# Count skills
SKILL_COUNT=$(find "$SKILLS_SOURCE" -maxdepth 2 -name "SKILL.md" | wc -l | tr -d ' ')

if [ "$SKILL_COUNT" -eq 0 ]; then
    echo_e "${RED}No skills found in $SKILLS_SOURCE${NC}"
    exit 1
fi

echo_e "${BLUE}Found $SKILL_COUNT skills to configure${NC}"
echo ""

# Interactive mode if no flags provided
if [ "$SETUP_CLAUDE" = false ] && [ "$SETUP_GEMINI" = false ] && [ "$SETUP_CODEX" = false ] && [ "$SETUP_COPILOT" = false ] && [ "$SETUP_CURSOR" = false ]; then
    show_menu
    echo ""
fi

# Check if at least one selected
if [ "$SETUP_CLAUDE" = false ] && [ "$SETUP_GEMINI" = false ] && [ "$SETUP_CODEX" = false ] && [ "$SETUP_COPILOT" = false ] && [ "$SETUP_CURSOR" = false ]; then
    echo_e "${YELLOW}No AI assistants selected. Nothing to do.${NC}"
    exit 0
fi

# Run selected setups
STEP=1
TOTAL=0
[ "$SETUP_CLAUDE" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_GEMINI" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_CODEX" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_COPILOT" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_CURSOR" = true ] && TOTAL=$((TOTAL + 1))
if [ "$SETUP_CLAUDE" = true ]; then
    echo_e "${YELLOW}[$STEP/$TOTAL] Setting up Claude Code...${NC}"
    setup_claude
    STEP=$((STEP + 1))
fi

if [ "$SETUP_GEMINI" = true ]; then
    echo_e "${YELLOW}[$STEP/$TOTAL] Setting up Gemini CLI...${NC}"
    setup_gemini
    STEP=$((STEP + 1))
fi

if [ "$SETUP_CODEX" = true ]; then
    echo_e "${YELLOW}[$STEP/$TOTAL] Setting up Codex (OpenAI)...${NC}"
    setup_codex
    STEP=$((STEP + 1))
fi

if [ "$SETUP_COPILOT" = true ]; then
    echo_e "${YELLOW}[$STEP/$TOTAL] Setting up GitHub Copilot...${NC}"
    setup_copilot
    STEP=$((STEP + 1))
fi

if [ "$SETUP_CURSOR" = true ]; then
    echo_e "${YELLOW}[$STEP/$TOTAL] Setting up Cursor Code...${NC}"
    setup_cursor
    STEP=$((STEP + 1))
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo_e "${GREEN}✅ Successfully configured $SKILL_COUNT AI skills!${NC}"
echo ""
echo "Configured:"
[ "$SETUP_CLAUDE" = true ] && echo "  • Claude Code:    .claude/skills/ + CLAUDE.md"
[ "$SETUP_CODEX" = true ] && echo "  • Codex (OpenAI): .codex/skills/ + AGENTS.md (native)"
[ "$SETUP_GEMINI" = true ] && echo "  • Gemini CLI:     .gemini/skills/ + GEMINI.md"
[ "$SETUP_COPILOT" = true ] && echo "  • GitHub Copilot: .github/copilot-instructions.md"
[ "$SETUP_CURSOR" = true ] && echo "  • Cursor Code:     .cursor/skills/ + AGENTS.md"
echo ""
echo_e "${BLUE}Note: Restart your AI assistant to load the skills.${NC}"
echo_e "${BLUE}      AGENTS.md is the source of truth - edit it, then re-run this script.${NC}"
