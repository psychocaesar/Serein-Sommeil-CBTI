# Trois pistes de logo pour Serein Sommeil, toutes construites sur le tracé exact du S de Serein
# (mêmes courbes que tools/icons/logo-serein.svg de Serein Relais, canevas 512).
# Usage : python3 outils/pistes.py <dossier de sortie>
import math, os, sys

C = [
    [(308, 158), (308, 158), (242, 142), (210, 178)],
    [(210, 178), (178, 214), (206, 240), (244, 252)],
    [(244, 252), (282, 264), (312, 284), (306, 322)],
    [(306, 322), (300, 358), (228, 370), (196, 362)],
]

def bez(c, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = c
    u = 1 - t
    return (u**3*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t**3*x3,
            u**3*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t**3*y3)

def split(c, t):
    L = lambda a, b: (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)
    a, b, d = L(c[0], c[1]), L(c[1], c[2]), L(c[2], c[3])
    e, f = L(a, b), L(b, d); g = L(e, f)
    return [c[0], a, e, g], [g, f, d, c[3]]

def sub(c, ta, tb):
    left, _ = split(c, tb)
    if tb == 0: return [c[0]]*4
    _, mid = split(left, ta / tb)
    return mid

# paramétrage par longueur d'arc sur les 4 courbes : s ∈ [0, 1]
SAMPLES = []
acc = 0.0
prev = C[0][0]
for i, c in enumerate(C):
    for k in range(1, 401):
        t = k / 400
        p = bez(c, t); acc += math.dist(prev, p); prev = p
        SAMPLES.append((acc, i, t))
TOTAL = acc

def locate(s):
    target = s * TOTAL
    for a, i, t in SAMPLES:
        if a >= target: return i, t
    return 3, 1.0

def segment(s0, s1):
    """Sous-chemin du S entre deux fractions de longueur, en courbes d'origine."""
    i0, t0 = locate(s0) if s0 > 0 else (0, 0.0)
    i1, t1 = locate(s1)
    parts = []
    for i in range(i0, i1 + 1):
        a = t0 if i == i0 else 0.0
        b = t1 if i == i1 else 1.0
        if b - a > 1e-4: parts.append(sub(C[i], a, b))
    d = "M %.1f %.1f" % parts[0][0]
    for p in parts: d += " C %.1f %.1f %.1f %.1f %.1f %.1f" % (*p[1], *p[2], *p[3])
    return d

def point(s):
    i, t = locate(s); return bez(C[i], t)

def normal(s):
    a, b = point(max(0, s - 0.002)), point(min(1, s + 0.002))
    dx, dy = b[0]-a[0], b[1]-a[1]; n = math.hypot(dx, dy)
    return (-dy/n, dx/n)

CENTER = (252, 260)

def svg(body, title, note, vb="0 0 512 512"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">
  <title>Serein Sommeil</title>
  <!-- {title} : {note} -->
  {body}
</svg>
'''

def g(inner, tf=""):
    return f'<g{(" transform=%s" % chr(34) + tf + chr(34)) if tf else ""} fill="none" stroke-linecap="round">{inner}</g>'

FULL = segment(0, 1)

# --- A. Le S couché : le S de Serein allongé (Serein se couche) -----------------------------
def piste_a(c1="#000", sw=44, moon=None):
    # rotation de -90° appliquée aux coordonnées (pas de transform : le master reste lisible par tous les outils)
    rot = lambda q: (252 + (q[1] - 260), 260 - (q[0] - 252))
    d = "M %.1f %.1f" % rot(C[0][0]) + "".join(" C %.1f %.1f %.1f %.1f %.1f %.1f" % (*rot(c[1]), *rot(c[2]), *rot(c[3])) for c in C)
    body = g(f'<path d="{d}" stroke="{c1}" stroke-width="{sw}"/>')
    if moon:
        # la lune posée dans le creux du S couché
        body += f'<circle cx="196" cy="246" r="20" fill="{moon}"/>'
    return body

# --- B. Le S qui se rassemble : la nuit morcelée (tirets) se regroupe en un trait continu ----
def piste_b(c1="#000", c2="#000", sw=44):
    # coupes nettes (bouts carrés) : des tirets de plus en plus longs qui finissent par se souder
    pieces = [(0.0, 0.05), (0.09, 0.17), (0.205, 0.32)]
    inner = "".join(f'<path d="{segment(a, b)}" stroke="{c1}" stroke-width="{sw}" stroke-linecap="butt"/>' for a, b in pieces)
    x, y = point(0.0)
    inner += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{sw/2}" fill="{c1}" stroke="none"/>'
    inner += f'<path d="{segment(0.35, 1)}" stroke="{c2}" stroke-width="{sw}" stroke-linecap="butt"/>'
    x, y = point(1.0)
    inner += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{sw/2}" fill="{c2}" stroke="none"/>'
    return g(inner)

# --- C. La nuit puis le matin : la tête du S devient un croissant, le bas reste le trait -----
def crescent(s0, s1, wmax, base_half, steps=80):
    """Forme pleine le long du S : bord intérieur = trait, bord extérieur gonflé au milieu (croissant)."""
    outer, inner = [], []
    for k in range(steps + 1):
        u = k / steps; s = s0 + (s1 - s0) * u
        p = point(s); nx, ny = normal(s)
        # le haut du S tourne vers la gauche puis descend : la normale (-dy, dx) pointe déjà vers l'extérieur
        w = wmax * math.sin(math.pi * u) ** 0.9
        inner.append((p[0] - nx * base_half * math.sin(math.pi * u) ** 0.6, p[1] - ny * base_half * math.sin(math.pi * u) ** 0.6))
        outer.append((p[0] + nx * w, p[1] + ny * w))
    pts = outer + inner[::-1]
    return "M " + " L ".join("%.1f %.1f" % q for q in pts) + " Z"

def piste_c(c1="#000", c2="#000", sw=44):
    moon = crescent(0.0, 0.40, 46, 14)
    body = f'<path d="{moon}" fill="{c1}"/>'
    body += g(f'<path d="{segment(0.50, 1)}" stroke="{c2}" stroke-width="{sw}"/>')
    return body

# --- C v4 (piste_c3 gardée plus haut pour mémoire). Un vrai croissant (deux arcs de cercle) forme la boucle haute du S --------------
def crescent_arcs(T1, T2, bulge, thick):
    """Croissant ouvert vers la droite : les deux cercles passent par les pointes T1 et T2.
    bulge = avancée du bord extérieur depuis le milieu de la corde ; thick = épaisseur au dos."""
    mx, my = (T1[0] + T2[0]) / 2, (T1[1] + T2[1]) / 2
    a = math.dist(T1, T2) / 2
    ho = (bulge**2 - a**2) / (2 * bulge)
    si = bulge - thick
    hi = (si**2 - a**2) / (2 * si)
    Ro, Ri = math.hypot(a, ho), math.hypot(a, hi)
    return (f"M {T1[0]:.1f} {T1[1]:.1f} A {Ro:.1f} {Ro:.1f} 0 {1 if ho > 0 else 0} 0 {T2[0]:.1f} {T2[1]:.1f} "
            f"A {Ri:.1f} {Ri:.1f} 0 {1 if hi > 0 else 0} 1 {T1[0]:.1f} {T1[1]:.1f} Z")

def piste_c3(c1="#000", c2="#000", sw=44, joint="coupe"):
    # pointe haute : le départ du S ; pointe basse : sur l'épine, là où le bas du S reprend
    T1 = (322, 152)
    if joint == "coupe":
        start = 0.50; T2 = (240, 250)
    else:  # soudé : la pointe basse de la lune se fond dans le départ du trait
        start = 0.44; T2 = point(0.47)
    moon = crescent_arcs(T1, T2, 122, 64)
    body = f'<path d="{moon}" fill="{c1}"/>'
    body += g(f'<path d="{segment(start, 1)}" stroke="{c2}" stroke-width="{sw}"/>')
    return body

def piste_c4(c1="#000", c2="#000", sw=44):
    # v4 : lune un peu plus légère, vraie coupure sur l'épine (le bout arrondi du trait ne touche plus la pointe)
    T1, T2 = (318, 154), (232, 244)
    moon = crescent_arcs(T1, T2, 114, 60)
    body = f'<path d="{moon}" fill="{c1}"/>'
    body += g(f'<path d="{segment(0.54, 1)}" stroke="{c2}" stroke-width="{sw}"/>')
    return body

# --- C v5. Lier la lune et le bas du S ---------------------------------------------------
def crescent_geom(T1, T2, bulge, thick):
    mx, my = (T1[0] + T2[0]) / 2, (T1[1] + T2[1]) / 2
    a = math.dist(T1, T2) / 2
    # normale à la corde orientée vers le dos de la lune (vers la gauche)
    dx, dy = (T2[0] - T1[0]) / (2 * a), (T2[1] - T1[1]) / (2 * a)
    nx, ny = dy, -dx
    if nx > 0: nx, ny = -nx, -ny
    ho = (bulge**2 - a**2) / (2 * bulge); si = bulge - thick; hi = (si**2 - a**2) / (2 * si)
    Co = (mx + nx * ho, my + ny * ho); Ci = (mx + nx * hi, my + ny * hi)
    return Co, math.hypot(a, ho), Ci, math.hypot(a, hi)

def cubic_pts(P0, P1, P2, P3, n=60):
    return [bez([P0, P1, P2, P3], k / n) for k in range(n + 1)]

def outline(pts, widths):
    """Contour plein d'un trait à épaisseur variable (bouts non arrondis)."""
    left, right = [], []
    for k, p in enumerate(pts):
        a, b = pts[max(0, k - 1)], pts[min(len(pts) - 1, k + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; L = math.hypot(tx, ty) or 1
        nx, ny = -ty / L, tx / L; w = widths[k] / 2
        left.append((p[0] + nx * w, p[1] + ny * w)); right.append((p[0] - nx * w, p[1] - ny * w))
    return "M " + " L ".join("%.1f %.1f" % q for q in left + right[::-1]) + " Z"

T1C, T2C = (318, 154), (232, 244)

def grad(id_, top, bottom):
    return (f'<defs><linearGradient id="{id_}" gradientUnits="userSpaceOnUse" x1="0" y1="190" x2="0" y2="300">'
            f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>')

# V1. Fondu : lune + trait (depuis l'intérieur de la lune) = une seule silhouette, dégradé possible
def piste_c5_fondu(c1="#000", c2=None, sw=44):
    T2 = point(0.40)
    moon = crescent_arcs(T1C, T2, 114, 60)
    fill = c1 if c2 is None else "url(#fondu)"
    head = "" if c2 is None else grad("fondu", c1, c2)
    return head + f'<path d="{moon}" fill="{fill}"/>' + g(f'<path d="{segment(0.36, 1)}" stroke="{fill}" stroke-width="{sw}"/>')

# V2. Deux croissants : la lune et son reflet, pointes jointes sur l'épine
def piste_c5_reflet(c1="#000", c2="#000", sw=44):
    cx, cy = 252, 262
    rot = lambda q: (2 * cx - q[0], 2 * cy - q[1])
    T2 = (248, 258)
    up = crescent_arcs(T1C, T2, 108, 54)
    lo = crescent_arcs(rot(T1C), rot(T2), 108, 54)
    return f'<path d="{up}" fill="{c1}"/><path d="{lo}" fill="{c2}"/>'

# V3. Queue effilée : la pointe basse de la lune s'étire et s'épaissit en bas du S, d'un seul geste
def piste_c5_geste(c1="#000", c2=None, sw=44):
    T2 = (236, 246)
    Co, Ro, Ci, Ri = crescent_geom(T1C, T2, 114, 60)
    moon = crescent_arcs(T1C, T2, 114, 60)
    # tangente de l'arc intérieur en T2 (sens : vers le bas / la droite)
    rx, ry = T2[0] - Ci[0], T2[1] - Ci[1]; L = math.hypot(rx, ry)
    tx, ty = -ry / L, rx / L
    if tx < 0: tx, ty = -tx, -ty
    s_join = 0.60
    P = point(s_join); i, t = locate(s_join)
    A, B = point(s_join - 0.004), point(s_join + 0.004)
    ux, uy = B[0] - A[0], B[1] - A[1]; Lu = math.hypot(ux, uy); ux, uy = ux / Lu, uy / Lu
    k = 40
    first = cubic_pts(T2, (T2[0] + tx * k, T2[1] + ty * k), (P[0] - ux * k, P[1] - uy * k), P)
    rest = [point(s_join + (1 - s_join) * j / 120) for j in range(1, 121)]
    pts = first + rest
    n1 = len(first)
    widths = [sw * (0.5 - 0.5 * math.cos(math.pi * min(1, k_ / (n1 - 1)))) for k_ in range(n1)] + [sw] * len(rest)
    tail = outline(pts, widths)
    end = pts[-1]
    fill = c1 if c2 is None else "url(#geste)"
    head = "" if c2 is None else grad("geste", c1, c2)
    return (head + f'<path d="{moon}" fill="{fill}"/><path d="{tail}" fill="{fill}"/>'
            f'<circle cx="{end[0]:.1f}" cy="{end[1]:.1f}" r="{sw/2}" fill="{fill}"/>')

# --- C v6. Deux croissants qui suivent le tracé exact du S de Serein -------------------------
def crescent_along(s0, s1, w_out, w_in, sign, p=0.7, n=90):
    """Croissant posé sur le tracé du S entre s0 et s1 : pointu aux deux bouts, renflé côté extérieur.
    sign = +1 si l'extérieur est du côté de la normale (-dy, dx), -1 sinon."""
    outer, inner = [], []
    for k in range(n + 1):
        u = k / n; s = s0 + (s1 - s0) * u
        c = point(s); nx, ny = normal(s); nx, ny = nx * sign, ny * sign
        f = math.sin(math.pi * u) ** p
        outer.append((c[0] + nx * w_out * f, c[1] + ny * w_out * f))
        inner.append((c[0] - nx * w_in * f, c[1] - ny * w_in * f))
    return "M " + " L ".join("%.1f %.1f" % q for q in outer + inner[::-1]) + " Z"

def piste_c6(c1="#000", c2="#000", w_out=34, w_in=12, p=0.7, gap=0.02):
    mid = 0.5
    up = crescent_along(0.0, mid - gap, w_out, w_in, +1, p)
    lo = crescent_along(mid + gap, 1.0, w_out, w_in, -1, p)
    return f'<path d="{up}" fill="{c1}"/><path d="{lo}" fill="{c2}"/>'

def piste_c6x(c1="#000", c2="#000", a=0.42, b=0.58, w_out=38, w_in=12, p=0.7):
    """Retenue : les deux lunes se croisent sur la diagonale du S (le reflet passe dessous)."""
    up = crescent_along(0.0, b, w_out, w_in, +1, p)
    lo = crescent_along(a, 1.0, w_out, w_in, -1, p)
    return f'<path d="{lo}" fill="{c2}"/><path d="{up}" fill="{c1}"/>'

GHOST = f'<path d="{FULL}" fill="none" stroke="#e0473c" stroke-width="2" stroke-dasharray="6 5"/>'

out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
VERT, SABLE, FOND = "#4db896", "#d8b78a", "#0f241d"
files = {
    "a-s-couche-v2.svg": svg(piste_a(), "A. Le S couché", "le S de Serein allongé : Serein se couche"),
        "b-s-rassemble-v3.svg": svg(piste_b(), "B. Le S qui se rassemble", "la nuit morcelée (tirets) se regroupe en un trait continu"),
    "c-nuit-matin-v2.svg": svg(piste_c(), "C. La nuit puis le matin", "la tête du S devient un croissant, le bas reste le trait"),
    "a-s-couche-couleur.svg": svg(f'<rect width="512" height="512" rx="108" fill="{FOND}"/>' + piste_a(VERT), "A couleur", "aperçu"),
    "b-s-rassemble-couleur.svg": svg(f'<rect width="512" height="512" rx="108" fill="{FOND}"/>' + piste_b(SABLE, VERT), "B couleur", "aperçu"),
    "c-nuit-matin-couleur.svg": svg(f'<rect width="512" height="512" rx="108" fill="{FOND}"/>' + piste_c(SABLE, VERT), "C couleur", "aperçu"),
}
CLAIR = "#efe6d2"
BG = f'<rect width="512" height="512" rx="108" fill="{FOND}"/>'
files.update({
    "c6-deux-lunes.svg": svg(piste_c6x(), "C v6. Deux lunes sur le tracé du S", "chaque moitié du S de Serein devient un croissant ; ils se croisent sur la diagonale"),
    "c6-deux-lunes-couleur.svg": svg(BG + piste_c6x(CLAIR, VERT), "C v6 couleur", "lune clair de lune en haut, reflet vert en bas"),
    "s-serein-reference.svg": svg(g(f'<path d="{FULL}" stroke="#000" stroke-width="44"/>'), "Référence", "le S de Serein, même tracé"),
    "c5-fondu.svg": svg(piste_c5_fondu(), "C v5. Fondu", "lune et bas du S en une seule silhouette"),
    "c5-fondu-couleur.svg": svg(BG + piste_c5_fondu(CLAIR, VERT), "C v5. Fondu couleur", "dégradé clair de lune → vert"),
    "c5-reflet.svg": svg(piste_c5_reflet(), "C v5. Deux croissants", "la lune et son reflet, pointes jointes"),
    "c5-reflet-couleur.svg": svg(BG + piste_c5_reflet(CLAIR, VERT), "C v5. Deux croissants couleur", "lune clair, reflet vert"),
    "c5-geste.svg": svg(piste_c5_geste(), "C v5. Queue effilée", "la pointe de la lune s'étire en bas du S"),
    "c5-geste-couleur.svg": svg(BG + piste_c5_geste(CLAIR, VERT), "C v5. Queue effilée couleur", "dégradé clair de lune → vert"),
    "c4-lune.svg": svg(piste_c4(), "C v4. La lune dans le S", "un croissant (deux arcs) forme la boucle haute du S ; coupure sur l'épine"),
    "c4-lune-clair.svg": svg(BG + piste_c4(CLAIR, VERT), "C v4 couleur", "lune clair de lune, trait vert"),
    "c4-lune-sable.svg": svg(BG + piste_c4(SABLE, VERT), "C v4 couleur", "lune sable, trait vert"),
    "c4-lune-vert.svg": svg(BG + piste_c4(VERT, VERT), "C v4 couleur", "une seule couleur"),
    "c3-lune-coupe.svg": svg(piste_c3(), "C v3. La lune dans le S", "un vrai croissant (deux arcs) forme la boucle haute ; coupure sur l'épine"),
    "c3-lune-soude.svg": svg(piste_c3(joint="soude"), "C v3 bis", "la pointe basse de la lune se fond dans le trait"),
    "c3-lune-coupe-sable.svg": svg(BG + piste_c3(SABLE, VERT), "C v3 couleur", "lune sable, trait vert"),
    "c3-lune-coupe-clair.svg": svg(BG + piste_c3(CLAIR, VERT), "C v3 couleur", "lune clair de lune, trait vert"),
    "c3-lune-coupe-vert.svg": svg(BG + piste_c3(VERT, VERT), "C v3 couleur", "une seule couleur"),
    "c3-lune-soude-clair.svg": svg(BG + piste_c3(CLAIR, VERT, joint="soude"), "C v3 bis couleur", "soudé, lune clair de lune"),
})
for n, s in files.items():
    open(os.path.join(out, n), "w").write(s)
print("\n".join(files))
