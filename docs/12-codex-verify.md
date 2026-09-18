# Codex: verify the running site against the planning Word file

Verification only. Do not change design system. Do not build the member studio.
If a required contact line is missing (especially the correspondence address), you MAY add that one line, then re-check. No other edits unless the page 404s because of a typo in routing.

---

你在本机核对，不要问我要不要开始。

## A. 读规划原文

打开并逐字提取：
`/Users/apple/Library/Mobile Documents/com~apple~CloudDocs/锺博士/根缘文化/网站资料/新加坡根缘文化学会 网站规划.docx`

从原文抽出完整栏目清单、每页要求的字段、使命原句、联络人要求。不要凭记忆。若文件读不到，停下来报路径错误。

同时参考仓库 `docs/02-site-map.md` 与 `docs/01-locked-decisions.md`（这两份是后来锁定的扩充，不是规划 docx 本身）。

## B. 检查本地站点

确认 `http://127.0.0.1:4321/` 能打开。不能打开就 `npm run dev`。

用 curl 或内置 fetch 抓取以下 URL 的 HTML（记录 HTTP 状态和页面主要 h1 / 导航链接）：

中文：`/` `/about` `/committee` `/method` `/publications` `/stories` `/events` `/membership` `/links` `/privacy` `/terms` `/contact`
英文：`/en/` `/en/about` `/en/committee` `/en/method` `/en/publications` `/en/stories` `/en/events` `/en/membership` `/en/links` `/en/privacy` `/en/terms` `/en/contact`

再读 `src/pages` 目录，列出实际路由。

## C. 按规划 docx 逐项打分

对每一项只能写：通过 / 部分 / 缺失 / 规划未要求但现站有。

至少核：
1. 封面古典味
2. 封面加音乐
3. 学会使命页，是否出现规划里的使命原句
4. 执委会名单是否六人齐
5. 执委会照片
6. 联络页是否同时有：锺骏源、秘书长、ianchungcy@gmail.com、9272 8933、95 Jalan Lokam
7. 英文联络页秘书长是否写 Ian Chung（不得是 Zhong Junyuan）
8. 活动传单
9. 活动花絫
10. 最新活动
11. 最新活动后台
12. 参考资料 / 出版物
13. 相册家谱 / 八大招说明

## D. 只准自动修的一项

若第 6 项缺 95 Jalan Lokam, Singapore 537915：补进中英文联络页脚或联络卡，然后再 curl `/contact` 与 `/en/contact` 确认出现。

## E. 交付给用户的报告（按这个标题写，要短）

1. 规划 docx 里的栏目原文清单
2. 对照表（规划项 / 现站路径 / 结论 / 证据摘句）
3. HTTP 状态表（24 条路由）
4. 你是否改了联络页通讯处
5. 不要做的事（音乐、活动后台、谱坊）
