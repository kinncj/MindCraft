# Kid-friendly design principles

The player is about six. These rules shape every screen and interaction.

## Big and obvious

- Buttons are at least 48px tall, rounded, and labeled with an emoji plus one or two words
- The selected block lifts out of the hotbar and shows its name
- One menu with shallow submenus: every row says what is behind it, and a big ‹ Back
  button always returns. Panels are bottom sheets on phones and cards on desktops.
- The tools live behind one Tools button so the play screen stays clear

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
- No sudden loud sounds; the soundtrack is soft, generated, and slows down at night; one big mute button
- No enemies, weapons, or damage — not even cartoonish

## Accessible

- Every control is reachable by keyboard and has an accessible label
- Focus states are thick and visible
- Status updates (saving/saved, toasts) use `role="status"` with `aria-live`
- Reduced-motion users get no button animations
