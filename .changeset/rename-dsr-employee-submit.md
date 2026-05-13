---
"@transcend-io/mcp-server-dsr": minor
---

Rename `dsr_employee_submit` tool to `dsr_submit_on_behalf` to clarify that the
distinction from `dsr_submit` is about the caller (admin filing on behalf of a
data subject), not the data subject's `subjectType`. The exported schema and
type are renamed accordingly (`submitDsrOnBehalfSchema`,
`SubmitDsrOnBehalfInput`), and both tool descriptions cross-reference each
other.

Also tightens `dsr_analyze`'s description to spell out exactly what it returns
(counts by type and status, completion rate, configurable recent-days window)
and when to reach for `dsr_list` instead.
