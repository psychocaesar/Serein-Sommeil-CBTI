# Serein Sommeil : l'icône de Serein (même fichier, même tracé, dégradé, halo, lueur) passée en ambiance nuit.
# Seules les couleurs changent ; option : un petit croissant à la place du point du haut.
# Usage : python3 outils/nuit.py <dossier de sortie>
import os, sys

S_PATH = """M 308 158
       C 308 158 242 142 210 178
       C 178 214 206 240 244 252
       C 282 264 312 284 306 322
       C 300 358 228 370 196 362"""

def icon(bg0, bg1, halo, s0, s1, s2, filet, dot_top, dot_bot, crescent=False, title=""):
    if crescent:
        # petit croissant posé à la place du point du haut (même centre, ouverture vers le bas-gauche, côté S)
        top = (f'<path d="M 322.5 152.4 A 15 15 0 1 1 304.6 172.4 A 11.5 11.5 0 1 0 322.5 152.4 Z" '
               f'fill="{dot_top}" opacity="0.95"/>')
    else:
        top = f'<circle cx="308" cy="158" r="7" fill="{dot_top}" opacity="0.7"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Serein Sommeil</title>
  <!-- {title} — icône de Serein (tracé, dégradé, halo, lueur identiques), couleurs de nuit -->
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="{bg0}"/>
      <stop offset="100%" stop-color="{bg1}"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="42%" r="50%">
      <stop offset="0%" stop-color="{halo}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="{halo}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stroke-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{s0}"/>
      <stop offset="50%" stop-color="{s1}"/>
      <stop offset="100%" stop-color="{s2}"/>
    </linearGradient>
    <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="halo-blur">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <ellipse cx="256" cy="210" rx="180" ry="160" fill="url(#halo)" filter="url(#halo-blur)"/>
  <path d="{S_PATH}" fill="none" stroke="url(#stroke-grad)" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-soft)"/>
  <path d="{S_PATH}" fill="none" stroke="{filet}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
  {top}
  <circle cx="196" cy="362" r="7" fill="{dot_bot}" opacity="0.5"/>
</svg>
'''

VARIANTS = {
    # A. clair de lune sur la nuit verte de Serein, juste plus profonde
    "nuit-a-clair-de-lune.svg": dict(bg0="#10241f", bg1="#050d0a", halo="#c9c2a4", s0="#fbf5e6", s1="#e6dab9", s2="#bfa97c",
                                     filet="#fffaf0", dot_top="#fbf5e6", dot_bot="#d8c8a0", title="A. Clair de lune, nuit verte"),
    # B. idem + petit croissant à la place du point du haut
    "nuit-b-croissant.svg": dict(bg0="#10241f", bg1="#050d0a", halo="#c9c2a4", s0="#fbf5e6", s1="#e6dab9", s2="#bfa97c",
                                 filet="#fffaf0", dot_top="#fbf5e6", dot_bot="#d8c8a0", crescent=True, title="B. Clair de lune + croissant"),
    # C. nuit bleu-vert (plus « nuit », reste dans la famille)
    "nuit-c-bleu-nuit.svg": dict(bg0="#132634", bg1="#060c14", halo="#8fb3c9", s0="#f4f1e6", s1="#d9d3bd", s2="#a9b8bd",
                                 filet="#ffffff", dot_top="#f4f1e6", dot_bot="#b9c6c9", title="C. Clair de lune, nuit bleutée"),
    # D. bleu-nuit + croissant
    "nuit-d-bleu-croissant.svg": dict(bg0="#132634", bg1="#060c14", halo="#8fb3c9", s0="#f4f1e6", s1="#d9d3bd", s2="#a9b8bd",
                                      filet="#ffffff", dot_top="#f4f1e6", dot_bot="#b9c6c9", crescent=True, title="D. Nuit bleutée + croissant"),
}

out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
for name, v in VARIANTS.items():
    open(os.path.join(out, name), "w").write(icon(**v))
print("\n".join(VARIANTS))
