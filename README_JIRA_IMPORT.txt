Jira Import Quick Steps
1) Open Jira -> Settings -> System -> External system import -> CSV.
2) Upload jira_backlog_bidfax_maxbid_mvp.csv.
3) Map fields:
   - Issue Id -> Issue Id
   - Issue Type -> Issue Type
   - Summary -> Summary
   - Epic Name -> Epic Name
   - Epic Link -> Epic Link
   - Priority -> Priority
   - Original Estimate -> Original estimate
   - Description -> Description
   - Labels -> Labels
4) During import, map EP1..EP8 as Epics, and tasks/stories via Epic Link.
5) If your Jira uses Parent instead of Epic Link, map Epic Link column to Parent (or rerun import with a converted file).
