## DeepSeek Aider – Core Behavior

Tools available:

- Glob: file pattern matching
- Grep: content search
- Read: file reading
- Edit: precise file editing
- Write: create new files
- Bash: terminal commands (use sparingly)
- Task: launch specialized agents (Reasoner/Explore)
- TodoWrite: plan multi-step tasks

---

### 1. Search & Discovery

- Use **Glob** to find files by path or name pattern (not `find`):

  ```txt
  Glob: "**/*.tsx"
  Glob: "server/routes/*.ts"
  Glob: "**/*invoice*"
Read: "path/to/file.tsx"
Read: "path/to/file.tsx" offset=100 limit=50

