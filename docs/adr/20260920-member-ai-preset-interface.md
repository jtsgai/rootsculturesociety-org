# ADR: Member AI preset interface

## Status

Accepted as a disabled interface. No provider is enabled yet.

## Decision

Members will choose from Society-approved presets instead of writing unrestricted provider prompts as the first interaction. The browser sends a provider-neutral request to `ai-assist`; the Edge Function validates the active member and book, reserves credits, and later calls a reviewed provider adapter. API keys stay in Supabase Edge Function secrets.

The first presets are:

- 修复老照片
- 黑白照片自然上色
- 提高清晰度
- 纸与树根主题封面
- 把家族故事整理成绘图提示词
- 整理资料搜索方向

Every image result is a new private object. The original upload is never overwritten. A member can review or discard the result before it becomes part of the book.

## Privacy and safety boundaries

- Do not send phone numbers, addresses, identity documents or unrelated family records to an AI provider.
- Do not generate an ancestor portrait or claim that an invented image is historical evidence.
- Keep generated images private by default; public publication requires a separate member consent and Society review.
- AI requests must be metered by the existing credit wallet and logged in `ai_jobs`.
- Provider failure must refund or release reserved credits through an explicit policy; never silently consume credits.

## Trade-offs

Presets reduce prompt mistakes and unsafe requests, but they are less flexible than unrestricted prompting. A later “编辑提示词” option may be added with the same privacy filters and a per-request length limit. Keeping the provider adapter behind the Edge Function avoids exposing API keys, but means AI remains unavailable until a provider, retention policy and credit price are approved.

## Flow

`member browser → ai-assist Edge Function → active-member/book check → reserve credits → provider adapter → private Storage → review → optional book attachment`

