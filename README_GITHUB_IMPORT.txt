GitHub Backlog Import (Issues)

Files:
- github_issues_seed.csv
- import_github_issues.ps1

1) Install GitHub CLI if needed:
   https://cli.github.com/

2) Login:
   gh auth login

3) Dry run:
   powershell -ExecutionPolicy Bypass -File J:\car-import-mvp\import_github_issues.ps1 -Repo owner/repo -DryRun

4) Create issues:
   powershell -ExecutionPolicy Bypass -File J:\car-import-mvp\import_github_issues.ps1 -Repo owner/repo

Notes:
- Labels are auto-applied from CSV (mvp, type/*, priority/*, epic/*).
- If some labels do not exist, GitHub will create them automatically in most repos where you have rights.
