# Music Guide

This game supports per-room background music and ending stingers. All music files go in the `music/` folder as `.mp3` files.

## Setup

1. Create the `music/` folder in the project root (if it doesn't already exist).
2. Add your `.mp3` files there.
3. The filenames in `data/rooms.json` must match exactly. To change a mapping, edit the `"music"` field on any room.

Music is muted by default. Players click the speaker icon in the top-right of the header to toggle it on/off. The preference persists across page reloads.

## Required Files

### Room Music (loops continuously)

| File | Rooms | Mood suggestion |
|------|-------|-----------------|
| `music/farmhouse.mp3` | Farmhouse | Creaky, warm, uneasy comfort. The home base. |
| `music/barn.mp3` | Barn, Hayloft, Milking Station, Chicken Coop | Dark rustic ambiance. Old wood, animal unease. |
| `music/garden.mp3` | Working Garden, Bee Hives | Deceptively peaceful. Nature with an edge. |
| `music/pasture.mp3` | Pasture | Open, windswept, exposed. Tension underneath. |
| `music/cornfield.mp3` | Cornfield | Rustling, claustrophobic, something watching. |
| `music/grainsilo.mp3` | Grain Silo, Silo Basement | Industrial drone. Cold, metallic, echoing. |
| `music/smokehouse.mp3` | Smokehouse | Thick, hazy, suffocating. Low rumble. |
| `music/oldwell.mp3` | Old Well | Deep reverb, dripping water, ghostly whispers. |
| `music/rootcellar.mp3` | Root Cellar | Underground, muffled, isolated dread. |

### Ending Music (plays once, does not loop)

| File | Trigger | Mood suggestion |
|------|---------|-----------------|
| `music/victory.mp3` | Player completes the breaking ritual | Relief, dawn breaking, curse lifted. |
| `music/gameover.mp3` | All 4 body parts claimed by curses | Grim finality, transformation complete. |

## Sharing Tracks Between Rooms

Multiple rooms can point to the same file. When the player moves between rooms that share a track, the music plays uninterrupted (no fade or restart). When the track changes, it crossfades over about 1 second.

The default mapping groups rooms by physical proximity (barn cluster, garden cluster, silo cluster). You can remap freely by editing `data/rooms.json` — just change the `"music"` value on any room to a different path.

## Adding a Track for a New Room

Add a `"music"` field to the room object in `data/rooms.json`:

```json
"myNewRoom": {
  "name": "My New Room",
  "music": "music/my-track.mp3",
  "connections": ["farmhouse"],
  ...
}
```

If you omit the `"music"` field, the current track fades to silence when the player enters that room.

## Format and Length

- **Format:** `.mp3` (universally supported by browsers)
- **Length:** Room tracks should be at least 1-2 minutes so the loop point isn't too obvious. Ending tracks can be any length.
- **Volume:** Normalize your tracks to a similar loudness. The game plays them at 40% volume by default.
