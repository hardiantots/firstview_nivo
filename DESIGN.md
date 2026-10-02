# NIVO — Calm Health Companion

Direction accepted on 1 October 2026: Mintlify-inspired reading structure, Intercom-inspired conversational surfaces, and restrained Notion-inspired geometry. These are independently curated references, not official brand specifications. Adapt their principles to NIVO; do not copy brand palettes or proprietary fonts.

References: https://github.com/voltagent/awesome-design-md, specifically design-md/mintlify, design-md/intercom, and design-md/notion.

## Identity

- Preserve primary `hsl(178 85% 18%)`, existing Outfit typography, and original logo files.
- Assets live in src/shared/assets; public/logo.png is used for metadata/icons. Never replace the logo with text, an icon, a CSS recreation, or a generated image.
- Retain important existing imagery. Avoid decorative stock photos in task-focused forms. No new raster assets are needed for this direction.

## Surfaces and hierarchy

- White canvas with softly tinted glass cards, translucent borders, and restrained blur. Preserve an opaque fallback when backdrop filters are unavailable. Semantic warning/error colors retain independent meaning.
- Primary teal signals the main action and selected navigation. Secondary orange appears on supporting actions, chart series, card accents, and focusable period selections; destructive actions use the destructive token.
- Each page has one introduction, then its immediate task. Home prioritizes daily entry and access to craving help. Use detail disclosures for explanations and destructive data controls.
- Use tabs for separate tasks, preserving mounted form contents when switching. Tabs support arrow keys, Home/End, and visible focus.
- Mobile is one column. Desktop task/content ratio around 1.35:1. Avoid stretching short copy across the entire viewport.

## Type and shapes

- Keep Outfit. Page titles 28–36px, section titles 18–24px, body 16px, supporting text 13–15px, line-height 1.55–1.65.
- Headings weight 600; use uppercase eyebrows sparingly. Avoid negative tracking on body text.
- Buttons/inputs radius 10px; cards 16px; major entry surfaces 24px. Pills only for badges or compact status labels.
- Minimum primary control height 48px; preserve accessible labels and native validation.
- Soft borders, minimal shadows, 8px-based spacing with 24–32px between sections.

## Data and conversation

- Never invent progress or predictions. Distinguish a reported zero (solid dot) from unreported dates (dashed marker).
- Seven-day charts include text labels and a details table in Tracker. Estimates disclose baseline assumptions.
- Home has 7/30-day consumption and savings charts, recorded craving outcomes, and a coverage ring. Its main progress ring measures cumulative recorded smoke-free days toward the next milestone; it does not infer a streak from a quit date. Missing estimates create gaps, and historical baselines remain attached to their original records.
- Reuse the original first-page illustration and abstract header texture within the home glass card. Keep the page canvas white and decorative images out of the accessibility tree.
- Duration since a selected quit date is not a smoke-free streak; label this explicitly.
- User messages align right with a soft mint bubble; peer messages align left on neutral surfaces. Sender, delivery/read state and human/system identity remain explicit.
- Closed services must show honest availability. Do not introduce demo consultant profiles to fill whitespace.

## Motion and accessibility

- Color/border transitions 140–180ms, brief 240–280ms surface entrances, and chart animation up to 450ms. No continuous decorative, celebratory, punitive, or bounce animations.
- Preserve reduced-motion support, focus outline, skip link and labeled mobile navigation.
- Check 320px mobile through 1440px desktop, 200% root font sizing, keyboard navigation, empty/loading/error/pending states, and visual viewport changes during chat entry.

## Scope

This design change does not mark consultation stage 04 complete. Stages 05–06 remain pending its acceptance conditions, as requested by the user. No backend deployment or AWS cutover is part of the design implementation.
