# Kid-friendly design principles

The player is about six. These rules shape every screen and interaction.

## Big and obvious

- Buttons are large, rounded, and labeled with an emoji plus one or two words
- The selected block is highlighted three ways: border, lift, and the side panel
- No nested menus. Everything important is one tap away.

## Friendly words

- "Your box is empty", not "No items found"
- "Saved on this computer", not "Sync complete"
- Errors explain and reassure: "That file does not look like a MindCraft world."
- Confirmations offer a way out AND a way to keep things: reset and import both offer
  "Export first"

## Forgiving

- No failure states, timers, scores, or health
- Remove mode undoes any mistake; reset restores the friendly starter world
- Destructive actions (reset, empty the box, import over the current world) always ask
  first, in plain words
- If saving is impossible (blocked IndexedDB), the game keeps working and says so gently

## No scary anything

- Bright palette, soft shapes, daylight sky
- No sudden sounds (currently no sound at all)
- No enemies, weapons, or damage — not even cartoonish

## Accessible

- Every control is reachable by keyboard and has an accessible label
- Focus states are thick and visible
- Status updates (saving/saved, toasts) use `role="status"` with `aria-live`
- Reduced-motion users get no button animations
