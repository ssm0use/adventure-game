# Image Guide

This document explains the naming conventions and folder structure for adding images to the game. Create images with the correct filenames, drop them in the right folder, and the game will pick them up automatically.

## Folder Structure

```
images/
  rooms/          -- Background images for each location (faded behind story text)
  mobs/           -- Creature/encounter images (shown in right sidebar)
  curses/
    stages/       -- Single-curse progression images (4 stages per curse)
    bodyparts/    -- Per-body-part images for paper-doll display (mixed curses)
```

## Recommended Format

- **Format:** PNG (transparency support) or JPG (smaller file size for backgrounds)
- **Room backgrounds:** 1200x800 or similar landscape ratio, atmospheric/moody (will be faded behind text)
- **Mob images:** 400x500 portrait orientation, transparent background (PNG)
- **Curse stages:** 300x450 portrait orientation, transparent background (PNG)
- **Body parts:** 150x150 square, transparent background (PNG) -- these tile in a cross/doll layout

---

## UI Layout

```
+-------------------+------------------------+------------------+
|   LEFT SIDEBAR    |      STORY AREA        |  RIGHT SIDEBAR   |
|                   |                        |                  |
|  Character name   |  [room background      |  [mob image      |
|  Stats            |   faded behind text]   |   during         |
|  Equipped         |                        |   encounters]    |
|  Inventory        |  Location header       |                  |
|  Curses           |  Curse status          |  -- or --        |
|  Save/Load        |  Story text            |                  |
|                   |  Choice buttons        |  [curse          |
|                   |  Hex map               |   transformation |
|                   |                        |   display]       |
+-------------------+------------------------+------------------+
```

### Right Sidebar Behavior

The right sidebar shows content based on game context (priority order):

1. **During encounters:** Mob creature image
2. **When cursed (single curse):** Stage progression image (stage 1-4)
3. **When cursed (multiple curses):** Paper-doll body map with per-part curse images
4. **No curse, no encounter:** Empty/subtle decorative state

---

## 1. Room Background Images

One image per location. Displayed as a faded/overlaid background behind the story text area for atmosphere. The text remains fully readable over it.

**Folder:** `images/rooms/`

| Filename | Location |
|----------|----------|
| `farmhouse.jpg` | Farmhouse |
| `barn.jpg` | Barn |
| `garden.jpg` | Working Garden |
| `pasture.jpg` | Pasture |
| `cornfield.jpg` | Cornfield |
| `smokehouse.jpg` | Smokehouse |
| `milkingStation.jpg` | Milking Station |
| `chickenCoop.jpg` | Chicken Coop |
| `beeHives.jpg` | Bee Hives |
| `grainSilo.jpg` | Grain Silo |
| `hayloft.jpg` | Hayloft |
| `rootcellar.jpg` | Root Cellar |
| `oldwell.jpg` | Old Well |
| `siloBasement.jpg` | Silo Basement |

**Art direction:** Dark, moody, atmospheric. These will be shown at low opacity behind text, so high-contrast or overly busy images won't work well. Think foggy, dim, slightly unsettling. The game applies a dark overlay via CSS so light images will still work.

**Note:** Filenames must match the room IDs exactly (case-sensitive).

---

## 2. Mob / Encounter Images

One image per creature type. Displayed in the right sidebar when the player is in an encounter.

**Folder:** `images/mobs/`

| Filename | Creature | Appears In |
|----------|----------|------------|
| `ghost.png` | Farmhouse Ghost | Farmhouse (Investigate the Cold Spot) |
| `cow.png` | Cursed Cow | Milking Station, Grain Silo |
| `scarecrow.png` | Scarecrow | Pasture, Cornfield |
| `bee.png` | Cursed Bees | Bee Hives |
| `zombie.png` | Zombie | Smokehouse |
| `mouse.png` | Cursed Mouse | Chicken Coop |
| `abigail.png` | Abigail's Spirit | Barn (friendly encounter) |

**How they map:** Each encounter has a curse type in its failure effect. The mob image filename matches that curse type. The `cow.png` image is reused for both the Milking Station and Grain Silo cow encounters. Same for `scarecrow.png` in Pasture and Cornfield.

The `abigail.png` is a special case -- she is a friendly ghost in the barn, not tied to a curse type. The code will look for `abigail.png` specifically for the barn ghost encounters (`abigail_hint` and `talk_to_ghost` events).

**Art direction:** Menacing, supernatural, farm-horror. Transparent backgrounds so they layer well over the sidebar. These should be striking -- the player sees them when danger is imminent.

**Note:** The spider curse exists (triggered by the Dusty Black Egg item) but has no combat encounter, so no mob image is needed unless you want one for flavor.

---

## 3. Curse Transformation Images

Two sets of images support two different display modes in the right sidebar.

### 3a. Stage Progression (Single Curse Active)

When the player has only ONE active curse, the sidebar shows a single portrait that gets progressively more transformed. 4 images per curse, one per stage.

**Folder:** `images/curses/stages/`

| Filename | Curse | What to Show |
|----------|-------|-------------|
| `ghost_stage1.png` | Ghost | Slight translucency, pale skin, faint glow |
| `ghost_stage2.png` | Ghost | Partially transparent limbs, hollow eyes |
| `ghost_stage3.png` | Ghost | Mostly spectral, barely human |
| `ghost_stage4.png` | Ghost | Fully transformed -- game over appearance |
| `cow_stage1.png` | Bovine | Subtle horn nubs, wider nose |
| `cow_stage2.png` | Bovine | Visible horns, patches of hide, hooflike hands |
| `cow_stage3.png` | Bovine | Mostly bovine, standing upright |
| `cow_stage4.png` | Bovine | Fully transformed -- game over appearance |
| `scarecrow_stage1.png` | Scarecrow | Stiff joints, straw poking from sleeves |
| `scarecrow_stage2.png` | Scarecrow | Skin turning to burlap, button eyes |
| `scarecrow_stage3.png` | Scarecrow | Mostly straw, limbs wooden |
| `scarecrow_stage4.png` | Scarecrow | Fully transformed -- game over appearance |
| `bee_stage1.png` | Bee | Yellow-tinted skin, buzzing sound |
| `bee_stage2.png` | Bee | Compound eye patches, wing buds |
| `bee_stage3.png` | Bee | Full wings, exoskeleton forming |
| `bee_stage4.png` | Bee | Fully transformed -- game over appearance |
| `zombie_stage1.png` | Zombie | Pallid skin, dark circles, shambling gait |
| `zombie_stage2.png` | Zombie | Decaying patches, exposed bone |
| `zombie_stage3.png` | Zombie | Mostly decayed, lurching movement |
| `zombie_stage4.png` | Zombie | Fully transformed -- game over appearance |
| `mouse_stage1.png` | Mouse | Twitchy nose, prominent front teeth |
| `mouse_stage2.png` | Mouse | Fur patches, ears enlarging, shrinking |
| `mouse_stage3.png` | Mouse | Mostly mouse-like, tail visible |
| `mouse_stage4.png` | Mouse | Fully transformed -- game over appearance |
| `spider_stage1.png` | Spider | Extra eye gleam, darkened skin |
| `spider_stage2.png` | Spider | Multiple eyes visible, web patterns on skin |
| `spider_stage3.png` | Spider | Extra limb buds, fangs forming |
| `spider_stage4.png` | Spider | Fully transformed -- game over appearance |

**Art direction:** Show the same character at progressive transformation levels. Stage 1 should be subtle and unsettling. Stage 4 should be the complete creature -- this is what appears on the game over screen.

### 3b. Body Part Images (Multiple Curses Active)

When the player has TWO OR MORE active curses, the sidebar switches to a paper-doll layout showing which curse affects which body part. Each part is displayed independently in a cross pattern:

```
         [head]
  [arms] [body] [legs]
```

**Folder:** `images/curses/bodyparts/`

**Clean (uncursed) body parts -- the default state:**

| Filename | Body Part |
|----------|-----------|
| `clean_head.png` | Normal human head |
| `clean_arms.png` | Normal human arms |
| `clean_body.png` | Normal human torso |
| `clean_legs.png` | Normal human legs |

**Cursed body parts -- one image per curse per body part:**

| Filename | Curse | Body Part |
|----------|-------|-----------|
| `ghost_head.png` | Ghost | Spectral/translucent head |
| `ghost_arms.png` | Ghost | Ghostly, translucent arms |
| `ghost_body.png` | Ghost | Spectral torso |
| `ghost_legs.png` | Ghost | Fading, translucent legs |
| `cow_head.png` | Bovine | Horned, widened bovine head |
| `cow_arms.png` | Bovine | Hoofed hands, hide-covered arms |
| `cow_body.png` | Bovine | Barrel-chested, hide torso |
| `cow_legs.png` | Bovine | Hoofed legs |
| `scarecrow_head.png` | Scarecrow | Button eyes, burlap face |
| `scarecrow_arms.png` | Scarecrow | Straw-stuffed, wooden arms |
| `scarecrow_body.png` | Scarecrow | Burlap and straw torso |
| `scarecrow_legs.png` | Scarecrow | Wooden stake legs |
| `bee_head.png` | Bee | Compound eyes, antennae |
| `bee_arms.png` | Bee | Chitinous arms, wing buds |
| `bee_body.png` | Bee | Striped exoskeleton torso |
| `bee_legs.png` | Bee | Segmented insect legs |
| `zombie_head.png` | Zombie | Decaying face, sunken eyes |
| `zombie_arms.png` | Zombie | Rotting, skeletal arms |
| `zombie_body.png` | Zombie | Decomposing torso |
| `zombie_legs.png` | Zombie | Shambling, decayed legs |
| `mouse_head.png` | Mouse | Whiskered snout, large ears |
| `mouse_arms.png` | Mouse | Tiny furred paws |
| `mouse_body.png` | Mouse | Small furred body |
| `mouse_legs.png` | Mouse | Tiny hind legs, tail |
| `spider_head.png` | Spider | Multiple eyes, fangs |
| `spider_arms.png` | Spider | Extra limbs, hairy |
| `spider_body.png` | Spider | Bulbous abdomen, thorax |
| `spider_legs.png` | Spider | Eight spindly legs |

**Art direction:** Each image should be a consistent 150x150 square with transparent background. Design them so they visually "snap together" in the cross layout. The clean parts should look like a normal person. The cursed parts should be grotesque but clearly match the curse theme. Mix-and-match combinations (e.g., cow head + spider legs + ghost arms) will be common, so they need to look coherent when combined.

---

## Quick Reference: All Files

```
images/
  rooms/                        (14 files)
    farmhouse.jpg
    barn.jpg
    garden.jpg
    pasture.jpg
    cornfield.jpg
    smokehouse.jpg
    milkingStation.jpg
    chickenCoop.jpg
    beeHives.jpg
    grainSilo.jpg
    hayloft.jpg
    rootcellar.jpg
    oldwell.jpg
    siloBasement.jpg

  mobs/                         (7 files)
    ghost.png
    cow.png
    scarecrow.png
    bee.png
    zombie.png
    mouse.png
    abigail.png

  curses/
    stages/                     (28 files)
      ghost_stage1.png
      ghost_stage2.png
      ghost_stage3.png
      ghost_stage4.png
      cow_stage1.png
      cow_stage2.png
      cow_stage3.png
      cow_stage4.png
      scarecrow_stage1.png
      scarecrow_stage2.png
      scarecrow_stage3.png
      scarecrow_stage4.png
      bee_stage1.png
      bee_stage2.png
      bee_stage3.png
      bee_stage4.png
      zombie_stage1.png
      zombie_stage2.png
      zombie_stage3.png
      zombie_stage4.png
      mouse_stage1.png
      mouse_stage2.png
      mouse_stage3.png
      mouse_stage4.png
      spider_stage1.png
      spider_stage2.png
      spider_stage3.png
      spider_stage4.png

    bodyparts/                  (32 files)
      clean_head.png
      clean_arms.png
      clean_body.png
      clean_legs.png
      ghost_head.png
      ghost_arms.png
      ghost_body.png
      ghost_legs.png
      cow_head.png
      cow_arms.png
      cow_body.png
      cow_legs.png
      scarecrow_head.png
      scarecrow_arms.png
      scarecrow_body.png
      scarecrow_legs.png
      bee_head.png
      bee_arms.png
      bee_body.png
      bee_legs.png
      zombie_head.png
      zombie_arms.png
      zombie_body.png
      zombie_legs.png
      mouse_head.png
      mouse_arms.png
      mouse_body.png
      mouse_legs.png
      spider_head.png
      spider_arms.png
      spider_body.png
      spider_legs.png
```

**Total: 14 room backgrounds + 7 mob images + 28 stage images + 32 body part images = 81 images**

---

## Priority Order for Creating Images

You do not need all 81 images to start. The code gracefully handles missing files. Suggested order:

1. **Room backgrounds (14)** -- Immediate atmosphere improvement, biggest visual impact
2. **Mob images (7)** -- Makes encounters feel alive
3. **Stage images for 2-3 curses (8-12)** -- Start with ghost and cow, the most common curses
4. **Clean body parts (4)** -- Needed before the paper-doll layout works
5. **Cursed body parts for those same 2-3 curses (8-12)** -- Completes the paper-doll for common curses
6. **Remaining stage and body part images** -- Fill in as time allows

---

## Implementation Plan

### Code Changes Needed

1. **index.html** -- Add right sidebar `<aside id="right-sidebar">` with image container and paper-doll grid
2. **styles.css** -- Three-column layout, room background overlay on story area, right sidebar styling, paper-doll cross layout
3. **js/ui.js** -- New render functions:
   - `renderRoomBackground(roomId)` -- sets faded background image on story area
   - `renderRightSidebar()` -- decides what to show (mob / single curse / multi curse / empty)
   - `renderMobImage(curseType)` -- shows mob portrait during encounters
   - `renderCurseTransformation()` -- shows stage image or paper-doll depending on curse count
   - `renderPaperDoll()` -- builds the cross layout from body map state
4. **js/main.js** -- Call sidebar render functions at key moments (room entry, encounter start/end, curse changes)

All image loading uses `onerror` fallbacks so missing images never break the game.
