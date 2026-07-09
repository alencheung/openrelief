#!/usr/bin/env bash
# Generates public/images/launch-demo.gif — terminal-style launch animation.
# Renders cumulative frames with ffmpeg drawtext, then assembles into a GIF.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="public/images/launch-demo.gif"
TMP=".gif-tmp"
rm -rf "$TMP"; mkdir -p "$TMP"

FONT="/c/Windows/Fonts/consola.ttf"
[ -f "$FONT" ] || FONT="/c/Windows/Fonts/cour.ttf"
[ -f "$FONT" ] || { echo "No monospace font found"; exit 1; }

W=800; H=500
# entries: prefix | text | textcolor(hex)
entries=(
  "#|OpenRelief - Quick Start|10b981"
  "\$|git clone https://github.com/openrelief/openrelief.git|e2e8f0"
  "\$|cd openrelief|e2e8f0"
  "\$|npm install|e2e8f0"
  "#|Start local Supabase (Postgres + PostGIS)|10b981"
  "\$|supabase start|e2e8f0"
  "#|Copy env template and fill in your keys|10b981"
  "\$|cp .env.example .env.local|e2e8f0"
  "#|Launch the dev server|10b981"
  "\$|npm run dev|22c55e"
  ">|http://localhost:3000  ready in 2.3s|3b82f6"
)

escape() { printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/:/\\\\:/g; s/'/\\\\o'/g; s/%/\\\\%/g"; }

total=${#entries[@]}
for ((frame=1; frame<=total; frame++)); do
  # Base: dark bg + title bar
  fc="drawbox=x=0:y=0:w=${W}:h=${H}:color=0x0b1120:t=fill"
  fc="${fc},drawbox=x=0:y=0:w=${W}:h=28:color=0x1e293b:t=fill"
  fc="${fc},drawbox=x=14:y=10:w=10:h=10:color=0xef4444:t=fill"
  fc="${fc},drawbox=x=32:y=10:w=10:h=10:color=0xf59e0b:t=fill"
  fc="${fc},drawbox=x=50:y=10:w=10:h=10:color=0x22c55e:t=fill"
  titlebar=$(escape "OpenRelief - bash - 80x24")
  fc="${fc},drawtext=fontfile='${FONT}':text='${titlebar}':x=350:y=7:fontsize=13:fontcolor=0x94a3b8"

  for ((i=0; i<frame; i++)); do
    IFS='|' read -r prefix text color <<< "${entries[$i]}"
    y=$(( 50 + i * 32 ))
    pesc=$(escape "$prefix")
    tesc=$(escape "$text")
    pc="0x22c55e"; [ "$prefix" = "#" ] && pc="0x10b981"; [ "$prefix" = ">" ] && pc="0x3b82f6"
    fc="${fc},drawtext=fontfile='${FONT}':text='${pesc}':x=28:y=${y}:fontsize=18:fontcolor=${pc}"
    fc="${fc},drawtext=fontfile='${FONT}':text='${tesc}':x=54:y=${y}:fontsize=18:fontcolor=0x${color}"
  done

  ffmpeg -y -loglevel error -f lavfi -i "color=0x0b1120:s=${W}x${H}:d=1" \
    -vf "$fc" -update 1 "$TMP/f$(printf '%03d' $frame).png"
done

# Hold final frame: copy it 3 extra times for a longer pause
for e in 1 2 3; do
  cp "$TMP/f$(printf '%03d' $total).png" "$TMP/f$(printf '%03d' $((total+e))).png"
done

# Concat list: paths are relative to this file's own directory (.gif-tmp/)
: > "$TMP/list.txt"
for ((f=1; f<=total+3; f++)); do
  printf "file 'f%03d.png'\n" "$f" >> "$TMP/list.txt"
  echo "duration 0.6" >> "$TMP/list.txt"
done
printf "file 'f%03d.png'\n" "$total" >> "$TMP/list.txt"

ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -vf "fps=2,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  "$OUT"

rm -rf "$TMP"
echo "Created $OUT ($(du -h "$OUT" | cut -f1))"
