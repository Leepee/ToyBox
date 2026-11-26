#!/usr/bin/env python3
"""
Renders public/media/sine-waves.mp4: the demo video for the Sine Waves lesson.

Every frame is drawn in code (numpy + Pillow), so the waves on screen are
mathematically exact and the timings line up with the cues in
public/lessons/sine-waves.json. The audio track is synthesised from the
same maths, so learners hear what they see.

    python3 scripts/render_sine_video.py           # needs numpy, Pillow, ffmpeg
"""
import math
import subprocess
import sys
import wave
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, SS = 1280, 720, 30, 2  # SS = supersampling factor for smooth lines
DURATION = 95.0
OUT = Path(__file__).resolve().parent.parent / "demo" / "public" / "media" / "sine-waves.mp4"
FONT_DIR = Path("/usr/share/fonts/opentype/inter")
if not FONT_DIR.exists():  # macOS fallback
    FONT_DIR = Path("/Library/Fonts")

BG = (11, 16, 32)
GRID = (26, 34, 60)
AXIS = (56, 68, 110)
TEXT = (229, 231, 235)
MUTED = (148, 163, 184)
AMBER = (245, 158, 11)
CYAN = (34, 211, 238)
PINK = (244, 114, 182)
GREEN = (74, 222, 128)
VIOLET = (167, 139, 250)

_fonts = {}


def font(size, weight="Medium"):
    key = (size, weight)
    if key not in _fonts:
        try:
            _fonts[key] = ImageFont.truetype(str(FONT_DIR / f"Inter-{weight}.otf"), size * SS)
        except OSError:
            _fonts[key] = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size * SS)
    return _fonts[key]


# ---------------------------------------------------------------- helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def fade(lt, length, d=0.45):
    """0→1→0 envelope for an element living for `length` seconds."""
    return clamp(lt / d) * clamp((length - lt) / d)


def mix(c, a):
    """Blend colour c over the background at opacity a."""
    return tuple(int(BG[i] + (c[i] - BG[i]) * a) for i in range(3))


def P(x, y):
    return (x * SS, y * SS)


def text(d, x, y, s, size=28, color=TEXT, weight="Medium", anchor="la", alpha=1.0):
    d.text(P(x, y), s, font=font(size, weight), fill=mix(color, alpha), anchor=anchor)


def rich(d, x, y, parts, size=34, anchor="mm", alpha=1.0):
    """Draw text made of coloured (string, colour) parts, centred at x."""
    f = font(size, "SemiBold")
    widths = [d.textlength(s, font=f) for s, _ in parts]
    cx = x * SS - sum(widths) / 2 if anchor == "mm" else x * SS
    for (s, c), w in zip(parts, widths):
        d.text((cx, y * SS), s, font=f, fill=mix(c, alpha), anchor="lm")
        cx += w


def line(d, pts, color, width=3, alpha=1.0):
    d.line([P(x, y) for x, y in pts], fill=mix(color, alpha), width=int(width * SS), joint="curve")


def dashed(d, x0, y0, x1, y1, color, width=2, dash=10, alpha=1.0):
    n = max(1, int(math.hypot(x1 - x0, y1 - y0) / dash))
    for i in range(0, n, 2):
        a, b = i / n, min(1, (i + 1) / n)
        line(d, [(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], color, width, alpha)


def dot(d, x, y, r, color, alpha=1.0):
    d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=mix(color, alpha))


def arrow(d, x0, y0, x1, y1, color, width=3, alpha=1.0, head=12):
    line(d, [(x0, y0), (x1, y1)], color, width, alpha)
    ang = math.atan2(y1 - y0, x1 - x0)
    for s in (-1, 1):
        a = ang + math.pi + s * 0.45
        line(d, [(x1, y1), (x1 + head * math.cos(a), y1 + head * math.sin(a))], color, width, alpha)


def grid(d, x0, x1, y0, y1, step=40, alpha=1.0):
    for x in range(int(x0), int(x1) + 1, step):
        line(d, [(x, y0), (x, y1)], GRID, 1, alpha)
    for y in range(int(y0), int(y1) + 1, step):
        line(d, [(x0, y), (x1, y)], GRID, 1, alpha)


def wave_pts(x0, x1, yc, amp_px, fn, n=500):
    """fn maps u∈[0,1] across the plot to a value in roughly [-1, 1]."""
    return [(x0 + (x1 - x0) * i / n, yc - amp_px * fn(i / n)) for i in range(n + 1)]


def axes(d, x0, x1, yc, h, alpha=1.0, label_t=True):
    grid(d, x0, x1, yc - h, yc + h, alpha=alpha * 0.9)
    line(d, [(x0, yc), (x1, yc)], AXIS, 2, alpha)
    line(d, [(x0, yc - h), (x0, yc + h)], AXIS, 2, alpha)
    if label_t:
        text(d, x1 - 6, yc + h - 6, "time →", 16, MUTED, anchor="rb", alpha=alpha)


def section(d, n, title, lt, length):
    a = fade(lt, length)
    text(d, 48, 40, f"{n}", 22, AMBER, "Bold", alpha=a)
    text(d, 74, 40, title, 22, TEXT, "SemiBold", alpha=a)


def caption(d, s, lt, length):
    a = fade(lt, length, 0.35)
    if a <= 0:
        return
    f = font(26, "Medium")
    w = d.textlength(s, font=f) / SS
    x0, y0 = W / 2 - w / 2 - 22, H - 96
    d.rounded_rectangle([P(x0, y0), P(x0 + w + 44, y0 + 52)], radius=14 * SS, fill=mix((0, 0, 0), 0.55 * a))
    text(d, W / 2, y0 + 26, s, 26, TEXT, anchor="mm", alpha=a)


def captions(d, t, items):
    for a, b, s in items:
        if a <= t < b:
            caption(d, s, t - a, b - a)


def equation(d, y, alpha, hi=None):
    """y = A·sin(2πft + φ) with the highlighted parameter in colour."""
    def c(name, col):
        return col if hi in (None, name) else MUTED
    rich(d, W / 2, y, [("y = ", TEXT), ("A", c("A", AMBER)), (" · sin(2π", TEXT), ("f", c("f", CYAN)),
                        ("t + ", TEXT), ("φ", c("phi", PINK)), (")", TEXT)], 34, alpha=alpha)


# ---------------------------------------------------------------- parameter curves (shared with audio)
def amp_curve(lt):           # scene 3
    return 0.55 + 0.4 * math.sin(2 * math.pi * lt / 6 - math.pi / 2)


def freq_curve(lt):          # scene 4: 1 → 4 → 1.6 Hz
    return 1 + 3 * (1 - math.cos(2 * math.pi * clamp(lt / 14) * 0.9)) / 2


def phase_curve(lt):         # scene 6 (radians)
    if lt < 7:
        return 2 * math.pi * ease(lt / 7)
    return math.pi * ease((lt - 9) / 3)


HARMONIC_TIMES = [0, 2.5, 4.5, 6.0, 7.5, 8.5, 9.3]  # scene 7: when harmonics 1,3,5,… appear


def harmonic_weights(lt):
    return [(2 * i + 1, ease((lt - t0) / 0.8) / (2 * i + 1)) for i, t0 in enumerate(HARMONIC_TIMES)]


# ---------------------------------------------------------------- scenes
def scene_title(d, t, lt, L):
    a = fade(lt, L, 0.8)
    for k, (col, amp, f, sp) in enumerate([(CYAN, 70, 1.5, 0.3), (PINK, 45, 2.5, -0.45), (AMBER, 30, 4, 0.6)]):
        pts = wave_pts(0, W, 470, amp, lambda u: math.sin(2 * math.pi * (f * u + sp * t)))
        line(d, pts, col, 3, 0.35 * a)
    text(d, W / 2, 250, "Sine Waves", 96, TEXT, "Bold", "mm", a)
    text(d, W / 2, 330, "The building block of sound, light and signals", 30, MUTED, anchor="mm", alpha=a)
    text(d, W / 2, 640, "An interactive ToyBox lesson", 20, AMBER, "SemiBold", "mm", a)


def scene_circle(d, t, lt, L):
    section(d, 1, "Meet the sine wave", lt, L)
    a = fade(lt, L)
    cx, cy, r = 240, 390, 130
    wx0, wx1 = 440, 1200
    speed = 0.35  # turns per second
    th = 2 * math.pi * speed * lt
    grid(d, wx0, wx1, cy - r - 20, cy + r + 20, alpha=a)
    line(d, [(wx0, cy), (wx1, cy)], AXIS, 2, a)
    line(d, [(cx - r - 30, cy), (cx + r + 30, cy)], AXIS, 2, a)
    line(d, [(cx, cy - r - 30), (cx, cy + r + 30)], AXIS, 2, a)
    d.ellipse([P(cx - r, cy - r), P(cx + r, cy + r)], outline=mix(MUTED, a), width=2 * SS)
    px, py = cx + r * math.cos(th), cy - r * math.sin(th)
    # angle arc
    d.arc([P(cx - 36, cy - 36), P(cx + 36, cy + 36)], -math.degrees(th) % 360, 360 if th % (2 * math.pi) > 0.01 else 0,
          fill=mix(PINK, a), width=3 * SS)
    line(d, [(cx, cy), (px, py)], TEXT, 3, a)
    line(d, [(px, cy), (px, py)], AMBER, 4, a)  # height
    # trailing wave: x distance ↔ time ago
    px_per_s = 260
    trail = min(wx1 - wx0, lt * px_per_s)
    pts = []
    for i in range(301):
        dx = trail * i / 300
        ago = dx / px_per_s
        pts.append((wx0 + dx, cy - r * math.sin(th - 2 * math.pi * speed * ago)))
    line(d, pts, CYAN, 4, a)
    dashed(d, px, py, wx0, py, MUTED, 2, 8, a)
    dot(d, px, py, 9, AMBER, a)
    dot(d, wx0, py, 8, CYAN, a)
    text(d, cx, cy + r + 50, "angle → height", 20, MUTED, anchor="mm", alpha=a)
    if lt > 6:
        equation(d, 130, a * ease((lt - 6) / 0.8))
    captions(d, lt, [(0.3, 6, "Spin a point around a circle at a steady speed…"),
                     (6, L, "…and track its height over time. That curve is a sine wave.")])


def scene_amplitude(d, t, lt, L):
    section(d, 2, "Amplitude", lt, L)
    a = fade(lt, L)
    x0, x1, yc, hp = 120, 1160, 390, 200
    A = amp_curve(lt)
    f, Wsec = 1.5, 2.0
    scroll = 0.25 * lt
    axes(d, x0, x1, yc, hp + 10, a)
    fn = lambda u: A * math.sin(2 * math.pi * (f * Wsec * u - scroll))
    for s in (1, -1):
        dashed(d, x0, yc - s * A * hp, x1, yc - s * A * hp, AMBER, 2, 10, 0.5 * a)
    line(d, wave_pts(x0, x1, yc, hp, fn), CYAN, 4, a)
    # arrow at the first crest
    u_crest = ((0.25 + scroll) % 1) / (f * Wsec)
    xc = x0 + (x1 - x0) * u_crest
    arrow(d, xc, yc, xc, yc - A * hp, AMBER, 4, a)
    text(d, xc + 16, yc - A * hp / 2, f"A = {A:.2f}", 26, AMBER, "Bold", "lm", a)
    equation(d, 130, a, "A")
    captions(d, lt, [(0.3, 6, "Amplitude (A) is how far the wave swings from the middle."),
                     (6, L, "For sound, more amplitude means louder.")])


def scene_frequency(d, t, lt, L):
    section(d, 3, "Frequency", lt, L)
    a = fade(lt, L)
    x0, x1, yc, hp = 120, 1160, 390, 170
    f = freq_curve(lt)
    Wsec = 2.0
    scroll = 0.3 * lt
    axes(d, x0, x1, yc, hp + 30, a)
    fn = lambda u: 0.85 * math.sin(2 * math.pi * (f * Wsec * u - scroll))
    line(d, wave_pts(x0, x1, yc, hp, fn, 800), CYAN, 4, a)
    # period bracket from the first upward zero crossing
    u0 = (scroll % 1) / (f * Wsec)
    if u0 < 0.02:
        u0 += 1 / (f * Wsec)
    T_px = (x1 - x0) / (f * Wsec)
    bx0 = x0 + (x1 - x0) * u0
    by = yc + hp + 22
    if bx0 + T_px < x1:
        line(d, [(bx0, by - 8), (bx0, by + 8)], VIOLET, 3, a)
        line(d, [(bx0 + T_px, by - 8), (bx0 + T_px, by + 8)], VIOLET, 3, a)
        line(d, [(bx0, by), (bx0 + T_px, by)], VIOLET, 3, a)
        text(d, bx0 + T_px / 2, by + 26, f"period T = 1/f = {1 / f:.2f} s", 20, VIOLET, "SemiBold", "mm", a)
    text(d, x1, 190, f"f = {f:.1f} Hz", 30, CYAN, "Bold", "ra", a)
    text(d, x1, 228, f"{f * Wsec:.1f} cycles in {Wsec:.0f} s", 18, MUTED, anchor="ra", alpha=a)
    equation(d, 130, a, "f")
    captions(d, lt, [(0.3, 7, "Frequency (f) is how many cycles happen every second, measured in hertz (Hz)."),
                     (7, L, "For sound, higher frequency means higher pitch.")])


def scene_your_turn(title, sub):
    def draw(d, t, lt, L):
        a = fade(lt, L, 0.3)
        line(d, wave_pts(0, W, 380, 40, lambda u: math.sin(2 * math.pi * (3 * u - 0.2 * t))), CYAN, 3, 0.18 * a)
        text(d, W / 2, 330, title, 54, AMBER, "Bold", "mm", a)
        text(d, W / 2, 400, sub, 26, MUTED, anchor="mm", alpha=a)
    return draw


def scene_check(d, t, lt, L):
    a = fade(lt, L, 0.3)
    text(d, W / 2, 120, "Quick check", 44, AMBER, "Bold", "mm", a)
    for k, (f, col, lab) in enumerate([(1.5, CYAN, "f"), (3, PINK, "2f")]):
        yc = 300 + k * 190
        axes(d, 200, 1080, yc, 70, a * 0.8, label_t=False)
        line(d, wave_pts(200, 1080, yc, 60, lambda u: math.sin(2 * math.pi * f * 2 * u)), col, 4, a)
        text(d, 170, yc, lab, 30, col, "Bold", "rm", a)


def scene_phase(d, t, lt, L):
    section(d, 4, "Phase", lt, L)
    a = fade(lt, L)
    x0, x1 = 120, 1000
    phi = phase_curve(lt)
    f = 2.0
    yc1, hp = 250, 80
    axes(d, x0, x1, yc1, hp + 20, a)
    line(d, wave_pts(x0, x1, yc1, hp, lambda u: math.sin(2 * math.pi * f * u)), CYAN, 3, a)
    line(d, wave_pts(x0, x1, yc1, hp, lambda u: math.sin(2 * math.pi * f * u + phi)), PINK, 4, a)
    # phase dial
    dx, dy, dr = 1110, 250, 58
    d.ellipse([P(dx - dr, dy - dr), P(dx + dr, dy + dr)], outline=mix(MUTED, a), width=2 * SS)
    line(d, [(dx, dy), (dx + dr, dy)], CYAN, 3, a)
    line(d, [(dx, dy), (dx + dr * math.cos(phi), dy - dr * math.sin(phi))], PINK, 4, a)
    deg = math.degrees(phi) % 360 if lt < 7 else math.degrees(phi)
    text(d, dx, dy + dr + 30, f"φ = {deg:.0f}°", 28, PINK, "Bold", "mm", a)
    # sum
    if lt > 7:
        b = a * ease((lt - 7) / 0.8)
        yc2 = 520
        axes(d, x0, x1, yc2, 110, b)
        line(d, wave_pts(x0, x1, yc2, 50, lambda u: math.sin(2 * math.pi * f * u) + math.sin(2 * math.pi * f * u + phi)),
             GREEN, 5, b)
        text(d, x0 - 14, yc2, "sum", 22, GREEN, "Bold", "rm", b)
        amp = abs(2 * math.cos(phi / 2))
        label = "constructive: they add up" if amp > 1.6 else "destructive: they cancel" if amp < 0.15 else ""
        text(d, x1, yc2 - 118, label, 22, GREEN, "SemiBold", "rb", b)
    captions(d, lt, [(0.3, 7, "Phase (φ) slides a wave along: where in its cycle it starts."),
                     (7, 11, "Add two waves that are in phase and they reinforce each other…"),
                     (11, L, "…but 180° out of phase, they cancel out completely.")])


def scene_fourier(d, t, lt, L):
    section(d, 5, "Complex waves & the FFT", lt, L)
    a = fade(lt, L)
    x0, x1, yc, hp = 100, 760, 370, 120
    axes(d, x0, x1, yc, hp + 50, a)
    hw = harmonic_weights(lt)
    cols = [CYAN, PINK, VIOLET, GREEN, AMBER, CYAN, PINK]
    f = 2
    for (n, w), col in zip(hw, cols):
        if w > 0.01:
            line(d, wave_pts(x0, x1, yc, hp, lambda u, n=n, w=w: w * math.sin(2 * math.pi * f * n * u), 600), col, 2,
                 0.35 * a)
    total = lambda u: sum(w * math.sin(2 * math.pi * f * n * u) for n, w in hw)
    line(d, wave_pts(x0, x1, yc, hp, total, 900), AMBER, 5, a)
    text(d, x0, yc - hp - 70, "wave = sum of sines", 20, MUTED, "Medium", alpha=a)
    # spectrum
    sx0, sx1, sy = 880, 1200, yc + 110
    b = a * ease((lt - 0.5) / 0.8)
    line(d, [(sx0, sy), (sx1, sy)], AXIS, 2, b)
    text(d, (sx0 + sx1) / 2, sy + 30, "frequency →", 18, MUTED, anchor="mm", alpha=b)
    text(d, (sx0 + sx1) / 2, yc - hp - 60, "Spectrum", 24, TEXT, "Bold", "mm", b)
    bw = (sx1 - sx0) / 14
    for (n, w), col in zip(hw, cols):
        if w > 0.005:
            bx = sx0 + (n - 0.5) * bw
            d.rectangle([P(bx - bw * 0.35, sy - 220 * w), P(bx + bw * 0.35, sy)], fill=mix(col, b))
            text(d, bx, sy + 8, f"{n}f", 13, MUTED, anchor="ma", alpha=b)
    if lt > 8.5:
        c = a * ease((lt - 8.5) / 0.6)
        arrow(d, 780, yc - 10, 860, yc - 10, TEXT, 3, c)
        text(d, 820, yc - 34, "FFT", 20, TEXT, "Bold", "mm", c)
    captions(d, lt, [(0.3, 8, "Most real signals aren't pure: they're many sine waves added together."),
                     (8, L, "A Fourier transform (FFT) runs this backwards: it finds the sines hiding inside.")])


def scene_outro(d, t, lt, L):
    a = fade(lt, L, 0.8)
    for col, amp, f, sp in [(CYAN, 50, 2, 0.25), (PINK, 30, 5, -0.4)]:
        line(d, wave_pts(0, W, 560, amp, lambda u: math.sin(2 * math.pi * (f * u + sp * t))), col, 3, 0.3 * a)
    text(d, W / 2, 180, "Waves are everywhere", 60, TEXT, "Bold", "mm", a)
    items = ["Sound", "Light", "Radio & Wi‑Fi", "Ocean swell", "Heartbeats", "Earthquakes"]
    for i, s in enumerate(items):
        b = a * ease((lt - 0.6 - i * 0.4) / 0.5)
        x = W / 2 + (i - 2.5) * 200
        text(d, x, 300, s, 24, [CYAN, AMBER, PINK, VIOLET, GREEN, CYAN][i], "SemiBold", "mm", b)
    text(d, W / 2, 400, "Now you know the four words that describe them all:", 24, MUTED, anchor="mm", alpha=a)
    rich(d, W / 2, 450, [("amplitude", AMBER), (" · ", MUTED), ("frequency", CYAN), (" · ", MUTED), ("phase", PINK),
                         (" · ", MUTED), ("spectrum", GREEN)], 34, alpha=a)
    text(d, W / 2, 660, "Made with ToyBox · interactive video for learning", 18, MUTED, anchor="mm", alpha=a)


SCENES = [
    (0, 7, scene_title),
    (7, 19, scene_circle),
    (19, 31, scene_amplitude),
    (31, 45, scene_frequency),
    (45, 47.5, scene_your_turn("Your turn", "Grab the sliders and match the wave")),
    (47.5, 51, scene_check),
    (51, 66, scene_phase),
    (66, 68.5, scene_your_turn("Your turn", "Make two waves cancel out")),
    (68.5, 84, scene_fourier),
    (84, 86.5, scene_your_turn("Your turn", "Build a wave, then break it apart")),
    (86.5, 95, scene_outro),
]


def render(i):
    t = i / FPS
    img = Image.new("RGB", (W * SS, H * SS), BG)
    d = ImageDraw.Draw(img)
    for a, b, fn in SCENES:
        if a <= t < b:
            fn(d, t, t - a, b - a)
    text(d, W - 20, H - 18, f"{int(t // 60)}:{int(t % 60):02d}", 14, MUTED, anchor="rb", alpha=0.6)
    return img.resize((W, H), Image.LANCZOS).tobytes()


# ---------------------------------------------------------------- audio
def make_audio(path, sr=44100):
    n = int(DURATION * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)

    def env(a, b, d=0.25):
        e = np.clip((t - a) / d, 0, 1) * np.clip((b - t) / d, 0, 1)
        return e

    def seg(a, b):
        return (t >= a) & (t < b)

    # amplitude: 330 Hz tone, loudness follows A
    s = seg(19, 31)
    A = np.array([amp_curve(x) for x in (t[s] - 19)])
    out[s] += 0.22 * A * np.sin(2 * np.pi * 330 * t[s])
    # frequency: pitch follows f (×110 to make it audible), phase-integrated
    s = seg(31, 45)
    f = np.array([freq_curve(x) for x in (t[s] - 31)]) * 110
    out[s] += 0.16 * np.sin(2 * np.pi * np.cumsum(f) / sr)
    # phase: two 220 Hz tones whose sum you hear cancel
    s = seg(58, 66)
    phi = np.array([phase_curve(x) for x in (t[s] - 51)])
    out[s] += 0.09 * (np.sin(2 * np.pi * 220 * t[s]) + np.sin(2 * np.pi * 220 * t[s] + phi))
    # fourier: harmonics join in sync with the picture
    s = seg(68.5, 84)
    lt = t[s] - 68.5
    for k, t0 in enumerate(HARMONIC_TIMES):
        nh = 2 * k + 1
        w = np.clip((lt - t0) / 0.8, 0, 1)
        w = w * w * (3 - 2 * w) / nh
        out[s] += 0.14 * w * np.sin(2 * np.pi * 165 * nh * t[s])

    for a, b in [(19, 31), (31, 45), (58, 66), (68.5, 84)]:
        m = seg(a - 1, b + 1)
        out[m] *= env(a, b)[m]
    pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main():
    frames = int(DURATION * FPS)
    if len(sys.argv) > 1 and sys.argv[1] == "--still":  # quick preview: --still 25.0 out.png
        i = int(float(sys.argv[2]) * FPS)
        Image.frombytes("RGB", (W, H), render(i)).save(sys.argv[3])
        return
    wav = OUT.with_suffix(".wav")
    make_audio(wav)
    ff = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "slow",
         "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-shortest",
         "-movflags", "+faststart", str(OUT)],
        stdin=subprocess.PIPE)
    with Pool() as pool:
        for k, buf in enumerate(pool.imap(render, range(frames), chunksize=8)):
            ff.stdin.write(buf)
            if k % (FPS * 10) == 0:
                print(f"  {k / FPS:5.1f}s / {DURATION:.0f}s", flush=True)
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
