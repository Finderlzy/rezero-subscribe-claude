"""宣传视频配乐用的合成器：正弦、噪声做成的音色和一条立体声音轨。全部原创合成，不用任何现成音乐。"""
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def env(n, a, d, curve=4.0):
    """a 秒起音、之后指数衰减；d 是衰减到约 2% 的时长"""
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0)
    return e * np.exp(-curve * np.maximum(t - a, 0) / d)


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def note(name):
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    n = names[name[0]] + (1 if '#' in name else 0)
    octave = int(name[-1])
    return 440.0 * 2 ** ((n + (octave - 4) * 12) / 12)


# ---------- 音色 ----------
def heartbeat():
    t = t_arr(0.35)
    f = 85 * np.exp(-t * 9) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.004, 0.3)


def tick(high):
    t = t_arr(0.06)
    click = fft_filter(rng.standard_normal(len(t)), lo=2500) * env(len(t), 0.0005, 0.02, 6)
    ping = np.sin(2 * np.pi * (2600 if high else 2000) * t) * env(len(t), 0.0005, 0.04, 6)
    return 0.5 * click + 0.4 * ping


def riser(d):
    n = int(d * SR)
    x = fft_filter(rng.standard_normal(n), lo=600, hi=7000)
    return x * np.linspace(0, 1, n) ** 3


def impact():
    t = t_arr(1.4)
    boom = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 3) + 28) / SR) * env(len(t), 0.003, 1.2)
    crack = fft_filter(rng.standard_normal(len(t)), lo=1800) * env(len(t), 0.001, 0.35, 5)
    glass = np.zeros(len(t))
    for _ in range(26):  # 碎玻璃：随机的高频小铃声
        st = int(rng.uniform(0, 0.5) * SR)
        f = rng.uniform(2500, 7500)
        n = len(t) - st
        glass[st:] += np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.001, rng.uniform(0.1, 0.4), 5) * rng.uniform(0.2, 0.6)
    return boom * 0.9 + crack * 0.35 + glass * 0.12


def music_box(f, d=1.6):
    t = t_arr(d)
    e = env(len(t), 0.002, d)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 6) + 0.12 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 10)
    return tone * e


def bell(f, d=3.0):
    t = t_arr(d)
    partials = [(1, 1), (2.76, 0.5), (5.4, 0.25), (8.93, 0.12)]
    return sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.5 + k * 0.6)) for k, a in partials) * env(len(t), 0.002, d, 2)


def pad(freqs, d, attack=0.8, release=1.2):
    t = t_arr(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.25, 0.0, 0.25):  # 微失谐，铺满
            ff = f * 2 ** (det / 12 / 10)
            x += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) + 0.25 * np.sin(2 * np.pi * 2 * ff * t)
    shape = np.minimum(t / attack, 1) * np.minimum((d - t) / release, 1)
    return x / (len(freqs) * 3) * np.clip(shape, 0, 1)


def sparkle(d=1.2, f0=1800, f1=6000):
    t = t_arr(d)
    x = np.zeros(len(t))
    for i in range(14):
        st = int(i / 14 * d * 0.8 * SR)
        f = f0 * (f1 / f0) ** (i / 13)
        n = len(t) - st
        x[st:] += np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.002, 0.35, 5)
    return x


def swipe(d=0.16):
    """划线：一小段由低到高扫过的噪声"""
    n = int(d * SR)
    x = fft_filter(rng.standard_normal(n), lo=1500, hi=9000)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2


def shaker():
    n = int(0.05 * SR)
    return fft_filter(rng.standard_normal(n), lo=6000) * env(n, 0.003, 0.04, 5)


def whoosh(d=0.4):
    n = int(d * SR)
    x = fft_filter(rng.standard_normal(n), lo=400, hi=5000)
    return x * np.linspace(0, 1, n) ** 2 * np.minimum(np.linspace(1, 0, n) * 6, 1)


def thud():
    t = t_arr(0.6)
    return np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 14) + 50) / SR) * env(len(t), 0.002, 0.45)


class Track:
    """一条 dur 秒的立体声音轨"""

    def __init__(self, dur):
        self.dur = dur
        self.n = int(SR * dur)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, at, gain=1.0, pan=0.0):
        """在 at 秒处叠加单声道信号，pan -1 左 … 1 右"""
        i = int(at * SR)
        if i >= self.n:
            return
        sig = sig[: self.n - i] * gain
        self.L[i : i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.41
        self.R[i : i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.41

    def write(self, path, reverb_wet=0.22, fade_out=1.2):
        """加混响、结尾淡出、峰值归一到 -1 dBFS，写成 16 位 WAV（响度在合进视频时再统一）"""
        L, R = reverb(self.L, wet=reverb_wet), reverb(self.R, wet=reverb_wet)
        fade = np.minimum((self.dur - np.arange(self.n) / SR) / fade_out, 1)
        L, R = L * fade, R * fade
        peak = max(np.abs(L).max(), np.abs(R).max())
        L, R = L / peak * 0.89, R / peak * 0.89
        with wave.open(str(path), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.stack([L, R], 1) * 32767).astype('<i2').tobytes())


def reverb(x, seconds=2.4, wet=0.22):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir = fft_filter(ir, hi=6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + wet * y
