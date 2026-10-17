# Planche de comparaison : noir, couleur(s), rangée « écran d'accueil » avec Serein et Relais.
# Usage : python3 outils/planche.py <sortie.svg> <titre> <sous-titre> <noir.svg> <couleur1.svg> [<couleur2.svg>] --labels "…" "…" ["…"]
import re, sys

def inline(path, x, y, size, tag):
    s = open(path).read()
    s = re.sub(r'<\?xml[^>]*>', '', s)
    for i in re.findall(r'id="([^"]+)"', s):
        s = s.replace(f'id="{i}"', f'id="{tag}-{i}"').replace(f'url(#{i})', f'url(#{tag}-{i})')
    s = re.sub(r'<title>.*?</title>', '', s, flags=re.S)
    head = re.search(r'<svg[^>]*>', s).group(0)
    head2 = re.sub(r'\s(width|height|x|y)="[^"]*"', '', head).replace('<svg', f'<svg x="{x}" y="{y}" width="{size}" height="{size}"', 1)
    return s.replace(head, head2, 1)

args = sys.argv[1:]
li = args.index("--labels")
out_path, title, subtitle, *files = args[:li]
labels = args[li + 1:]
W, H = 1600, 900
o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
     f'<rect width="{W}" height="{H}" fill="#f4f1ea"/>',
     f'<text x="60" y="80" font-family="Helvetica" font-size="40" font-weight="700" fill="#1d2a25">{title}</text>',
     f'<text x="60" y="120" font-family="Helvetica" font-size="22" fill="#5d7066">{subtitle}</text>',
     '<rect x="60" y="160" width="440" height="440" rx="24" fill="#fff"/>']
for k, f in enumerate(files):
    o.append(inline(f, 60 + 500 * k, 160, 440, f"p{k}"))
    o.append(f'<text x="{60 + 500 * k}" y="640" font-family="Helvetica" font-size="22" fill="#1d2a25">{labels[k]}</text>')
o.append('<rect x="60" y="680" width="1480" height="190" rx="24" fill="#3d566e"/>')
row = [("famille/serein.svg", "Serein"), ("famille/relais.svg", "Serein Relais"), (files[-1], "Serein Sommeil")]
x = 110
for i, (p, n) in enumerate(row):
    o.append(inline(p, x, 705, 110, f"h{i}"))
    o.append(f'<text x="{x + 55}" y="845" text-anchor="middle" font-family="Helvetica" font-size="20" fill="#fff">{n}</text>')
    x += 190
x = 760
for size in (64, 32, 16):
    for i, (p, n) in enumerate(row):
        o.append(inline(p, x, 760 - size / 2, size, f"k{size}{i}"))
        x += size + 14
    x += 40
o.append('<text x="760" y="845" font-family="Helvetica" font-size="18" fill="#dfe7ee">64 · 32 · 16 px, à côté de Serein et Relais</text>')
o.append('</svg>')
open(out_path, "w").write("\n".join(o))
