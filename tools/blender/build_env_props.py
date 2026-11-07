#!/usr/bin/env python3
"""Headless Blender (bpy) build of the Demo 0.4 environment props for the three.js prototype.

Run with the `bpy` module from PyPI (Blender 5.2 LTS as a Python module), e.g.:

    python -m venv venv-bpy && venv-bpy/bin/pip install bpy pillow
    venv-bpy/bin/python -I tools/blender/build_env_props.py --dl <assets_dl> --tex <work>/props_tex \
        --out <work>/glb_raw --cards prototype/web/assets/foliage [--preview <png>]

Inputs are images and glTF meshes only (CC0 from Poly Haven, fetched by tools/assets/fetch_polyhaven.py,
graded by tools/assets/prepare_textures.py); nothing downloaded is executed.

Outputs (then compressed with tools/assets/compress_glb.mjs into prototype/web/assets/models/):
  env_props.glb   self-made props, every one [SÁNG TẠO]: Đông Sơn style stilt house (boat-shaped saddle roof,
                  ridge longer than the eaves, gable ends leaning out; NOT a Chinese/Japanese roof: no
                  upturned eave corners, no tiles), bamboo jetty module, stakes (sharpened / broken /
                  mooring), dugout canoe + paddle, abandoned kiln (ruined) and hub casting furnace,
                  plain coarse jar (thạp, no decoration), wooden skin-headed drum, rattan chest.
  env_nature.glb  Poly Haven CC0 models decimated (+ LOD1): mossy rocks, fallen trunk, stump, shrub, fern,
                  weed, dry branches; plus a self-made fig-like tree (trunk/branches + shrub leaf clumps).
  reed_atlas.webp / grass_atlas.webp  alpha cards rendered with Cycles from modelled reed / grass clumps.

Blender axes: X east, Y north, Z up (glTF export converts to Y-up: three z = -Blender y).
"""
import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector, noise

A = None  # parsed args


# ----------------------------------------------------------------------------------------- materials
def image(path, noncolor=False):
    im = bpy.data.images.load(path, check_existing=True)
    if noncolor:
        im.colorspace_settings.name = "Non-Color"
    return im


def pbr(name, base, rough=None, normal_strength=1.0, alpha=False, diff_name=None):
    """Principled material from <tex>/<base>_{diff,nor,rough}.png (or a solid colour when base is a hex)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if base.startswith("#"):
        h = base.lstrip("#")
        c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        bsdf.inputs["Base Color"].default_value = [((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
        bsdf.inputs["Roughness"].default_value = rough if rough is not None else 0.8
        return m
    t = A.tex
    d = nt.nodes.new("ShaderNodeTexImage")
    d.image = image(os.path.join(t, diff_name or f"{base}_diff.png"))
    nt.links.new(d.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha:
        nt.links.new(d.outputs["Alpha"], bsdf.inputs["Alpha"])
    rp = os.path.join(t, f"{base}_rough.png")
    if os.path.exists(rp) and rough is None:
        r = nt.nodes.new("ShaderNodeTexImage")
        r.image = image(rp, True)
        nt.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = rough if rough is not None else 0.85
    np_ = os.path.join(t, f"{base}_nor.png")
    if os.path.exists(np_):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = image(np_, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Metallic"].default_value = 0.0
    return m


# ----------------------------------------------------------------------------------------- mesh builder
class MB:
    """Accumulates quads/tris with per-loop UVs, material slots and smooth flags, then builds one object."""

    def __init__(self):
        self.v, self.f, self.uv, self.mi, self.sm = [], [], [], [], []

    def vert(self, p):
        self.v.append(tuple(p))
        return len(self.v) - 1

    def face(self, idx, uvs, mat, smooth=True):
        self.f.append(tuple(idx))
        self.uv.append([tuple(u) for u in uvs])
        self.mi.append(mat)
        self.sm.append(smooth)

    def grid(self, P, mat, smooth=True, uvf=None, flip=False):
        """P[i][j] -> Vector. UV from uvf(i, j) (default: arc length in metres)."""
        ni, nj = len(P), len(P[0])
        if uvf is None:
            us = [[0.0] * nj for _ in range(ni)]
            vs = [[0.0] * nj for _ in range(ni)]
            for i in range(ni):
                for j in range(1, nj):
                    vs[i][j] = vs[i][j - 1] + (P[i][j] - P[i][j - 1]).length
            for j in range(nj):
                for i in range(1, ni):
                    us[i][j] = us[i - 1][j] + (P[i][j] - P[i - 1][j]).length
            uvf = lambda i, j: (us[i][j], vs[i][j])  # noqa: E731
        ids = [[self.vert(P[i][j]) for j in range(nj)] for i in range(ni)]
        for i in range(ni - 1):
            for j in range(nj - 1):
                q = [ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]]
                u = [uvf(i, j), uvf(i + 1, j), uvf(i + 1, j + 1), uvf(i, j + 1)]
                if flip:
                    q, u = q[::-1], u[::-1]
                self.face(q, u, mat, smooth)
        return ids

    def tube(self, pts, radii, mat, seg=8, uv_u=1.0, uv_v=1.0, cap=True, jitter=0.0, seed=0):
        """Tube along a polyline. UV: u = around (0..uv_u), v = metres along * uv_v."""
        rng = random.Random(seed)
        pts = [Vector(p) for p in pts]
        n = len(pts)
        frames = []
        up = Vector((0, 0, 1))
        for i in range(n):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            ref = up if abs(t.dot(up)) < 0.95 else Vector((1, 0, 0))
            a = t.cross(ref).normalized()
            b = t.cross(a).normalized()
            frames.append((a, b))
        rings = []
        for i in range(n):
            a, b = frames[i]
            ring = []
            for k in range(seg + 1):
                th = 2 * math.pi * k / seg
                r = radii[i] * (1 + (rng.uniform(-jitter, jitter) if jitter and k < seg else 0))
                ring.append(pts[i] + (a * math.cos(th) + b * math.sin(th)) * r)
            ring[seg] = ring[0] if not jitter else ring[0]
            rings.append(ring)
        L = [0.0]
        for i in range(1, n):
            L.append(L[-1] + (pts[i] - pts[i - 1]).length)
        P = [[rings[i][k] for i in range(n)] for k in range(seg + 1)]
        self.grid(P, mat, True, lambda k, i: (k / seg * uv_u, L[i] * uv_v))
        if cap:
            for end, sgn in ((0, -1), (n - 1, 1)):
                c = self.vert(pts[end])
                for k in range(seg):
                    i0, i1 = self.vert(rings[end][k]), self.vert(rings[end][k + 1])
                    q = [c, i0, i1] if sgn > 0 else [c, i1, i0]
                    th0, th1 = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
                    uv = [(0.5, 0.5), (0.5 + 0.5 * math.cos(th0) * radii[end] * 2, 0.5 + 0.5 * math.sin(th0) * radii[end] * 2),
                          (0.5 + 0.5 * math.cos(th1) * radii[end] * 2, 0.5 + 0.5 * math.sin(th1) * radii[end] * 2)]
                    self.face(q, uv if sgn > 0 else [uv[0], uv[2], uv[1]], mat, False)

    def box(self, c, s, mat, rot=None, uv_scale=1.0, along=None):
        """Axis box centre c size s (rotated by Matrix rot). UV box-mapped in metres*uv_scale.
        along: 'x'|'y'|'z' = axis that maps to texture v (planks / grain direction)."""
        c, s = Vector(c), Vector(s)
        rot = rot or Matrix.Identity(3)
        hx, hy, hz = s.x / 2, s.y / 2, s.z / 2
        corners = [Vector((x, y, z)) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
        W = [c + rot @ p for p in corners]
        faces = [((0, 1, 3, 2), 0, -1), ((4, 6, 7, 5), 0, 1), ((0, 4, 5, 1), 1, -1), ((2, 3, 7, 6), 1, 1), ((0, 2, 6, 4), 2, -1), ((1, 5, 7, 3), 2, 1)]
        for idx, ax, _sg in faces:
            loc = [corners[i] for i in idx]
            other = [k for k in range(3) if k != ax]
            vax = {"x": 0, "y": 1, "z": 2}.get(along, other[1])
            if vax == ax:
                vax = other[1]
            uax = [k for k in other if k != vax][0] if vax in other else other[0]
            uvs = [(p[uax] * uv_scale, p[vax] * uv_scale) for p in loc]
            self.face([self.vert(W[i]) for i in idx], uvs, mat, False)

    def lathe(self, profile, mat, seg=24, uv_u=None, close_top=False, noise_amp=0.0, seed=0, cut=None):
        """Surface of revolution from [(r, z), ...] (bottom to top). cut(theta, z) -> True removes the face."""
        rng = random.Random(seed)
        off = Vector((rng.uniform(0, 50), rng.uniform(0, 50), rng.uniform(0, 50)))
        P = []
        for k in range(seg + 1):
            th = 2 * math.pi * (k % seg) / seg
            col = []
            for r, z in profile:
                p = Vector((r * math.cos(th), r * math.sin(th), z))
                if noise_amp:
                    p += Vector((math.cos(th), math.sin(th), 0)) * noise.noise(p * 1.3 + off) * noise_amp
                col.append(p)
            P.append(col)
        circ = 2 * math.pi * max(r for r, _ in profile)
        uu = uv_u or circ
        L = [0.0]
        for i in range(1, len(profile)):
            L.append(L[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
        ni, nj = len(P), len(P[0])
        ids = [[self.vert(P[i][j]) for j in range(nj)] for i in range(ni)]
        for i in range(ni - 1):
            for j in range(nj - 1):
                th = 2 * math.pi * (i + 0.5) / seg
                if cut and cut(th, (profile[j][1] + profile[j + 1][1]) / 2):
                    continue
                q = [ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]]
                u = [(i / seg * uu, L[j]), ((i + 1) / seg * uu, L[j]), ((i + 1) / seg * uu, L[j + 1]), (i / seg * uu, L[j + 1])]
                self.face(q, u, mat, True)
        return ids

    def build(self, name, mats, collection=None):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.validate(clean_customdata=False)
        uvl = me.uv_layers.new(name="UVMap")
        li = 0
        for p, uvs in zip(me.polygons, self.uv):
            for k, loop in enumerate(p.loop_indices):
                uvl.data[loop].uv = uvs[k] if k < len(uvs) else uvs[-1]
            li += 1
        me.polygons.foreach_set("material_index", self.mi[: len(me.polygons)])
        me.polygons.foreach_set("use_smooth", self.sm[: len(me.polygons)])
        for m in mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        (collection or bpy.context.scene.collection).objects.link(ob)
        return ob


# ----------------------------------------------------------------------------------------- helpers
def V(*a):
    return Vector(a)


def curve_pts(p0, p1, sag=0.0, n=6, bend=V(0, 0, 0)):
    p0, p1 = Vector(p0), Vector(p1)
    return [p0.lerp(p1, i / (n - 1)) + bend * math.sin(math.pi * i / (n - 1)) + V(0, 0, -sag * math.sin(math.pi * i / (n - 1))) for i in range(n)]


def decimate(ob, ratio):
    if ratio >= 0.999:
        return ob
    mod = ob.modifiers.new("dec", "DECIMATE")
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob
    with bpy.context.temp_override(object=ob, active_object=ob):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def lod_copy(ob, ratio, name=None):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = name or ob.name + "_LOD1"
    bpy.context.scene.collection.objects.link(c)
    return decimate(c, ratio)


# ----------------------------------------------------------------------------------------- props (self-made)
def stilt_house(M):
    """Nhà sàn, Đông Sơn style [SÁNG TẠO, tham chiếu hình nhà sàn mái cong trên trống đồng, ART_DIRECTION §2].
    Origin at ground centre; floor at 1.9 m; door and ladder on the -X gable (west) end."""
    mb = M_HEWN, M_PLANK, M_WOVEN, M_THATCH, M_BAMBOO = 0, 1, 2, 3, 4
    b = MB()
    FX, FY, FZ = 3.1, 2.0, 1.9  # half floor size, floor height
    rng = random.Random(11)
    # Posts (hewn), 4 x 3, the outer row continues as wall posts.
    xs, ys = [-3.0, -1.0, 1.0, 3.0], [-1.9, 0.0, 1.9]
    for x in xs:
        for y in ys:
            top = 3.35 if abs(y) > 1 or abs(x) > 2.5 else FZ
            b.tube([V(x, y, -0.5), V(x + rng.uniform(-0.03, 0.03), y, top)], [0.12, 0.1], M_HEWN, 7, 1.0, 0.5, jitter=0.08, seed=int(x * 10 + y))
    # Floor beams and joists.
    for y in ys:
        b.box(V(0, y, FZ - 0.12), V(6.6, 0.16, 0.18), M_HEWN, uv_scale=0.5, along="x")
    for x in xs:
        b.box(V(x, 0, FZ - 0.26), V(0.16, 4.3, 0.14), M_HEWN, uv_scale=0.5, along="y")
    # Floor deck + west porch (planks run across Y).
    b.box(V(0, 0, FZ), V(6.5, 4.2, 0.07), M_PLANK, uv_scale=0.45, along="y")
    b.box(V(-3.9, 0, FZ - 0.05), V(1.4, 2.6, 0.06), M_PLANK, uv_scale=0.45, along="y")
    for y in (-1.2, 1.2):
        b.tube([V(-4.5, y, -0.4), V(-4.5, y, FZ - 0.05)], [0.08, 0.07], M_BAMBOO, 7, 1, 1 / 1.2)
    # Woven bamboo walls, wall plates, door gap on the west wall.
    WZ0, WZ1 = FZ + 0.03, 3.3
    for y in (-1.95, 1.95):
        b.box(V(0, y, (WZ0 + WZ1) / 2), V(6.0, 0.05, WZ1 - WZ0), M_WOVEN, uv_scale=0.7, along="z")
    b.box(V(3.0, 0, (WZ0 + WZ1) / 2), V(0.05, 3.9, WZ1 - WZ0), M_WOVEN, uv_scale=0.7, along="z")
    for y0, y1 in ((-1.95, -0.45), (0.45, 1.95)):
        b.box(V(-3.0, (y0 + y1) / 2, (WZ0 + WZ1) / 2), V(0.05, y1 - y0, WZ1 - WZ0), M_WOVEN, uv_scale=0.7, along="z")
    b.box(V(-3.0, 0, WZ1 - 0.12), V(0.05, 0.9, 0.24), M_WOVEN, uv_scale=0.7, along="z")
    for y in (-1.95, 1.95):
        b.box(V(0, y, WZ1), V(6.4, 0.14, 0.12), M_HEWN, uv_scale=0.5, along="x")
    # Saddle roof: ridge sags in the middle and sweeps up at the ends; the ridge is longer than the
    # eaves so the gable ends lean outward (boat-shaped house on the drums). Eaves stay straight-ish
    # and low: no upturned eave corners.
    NU, NV = 28, 10
    XE, XR, W = 3.9, 5.0, 3.0

    def ridge_z(x):
        return 5.0 + 0.75 * (abs(x) / XR) ** 2.4

    def eave_z(x):
        return 2.9 + 0.22 * (abs(x) / XE) ** 2

    def roof_pt(u, v, side, drop=0.0):
        X = XE + (XR - XE) * v ** 1.6
        x = u * X
        z = eave_z(u * XE) + (ridge_z(x) - eave_z(u * XE)) * (1 - (1 - v) ** 1.25)
        y = side * W * (1 - v) * (1 - 0.06 * abs(u) ** 3)
        return V(x, y, z - drop)

    TH = 0.24
    for side in (-1, 1):
        top = [[roof_pt(-1 + 2 * i / NU, j / NV, side) for j in range(NV + 1)] for i in range(NU + 1)]
        bot = [[roof_pt(-1 + 2 * i / NU, j / NV, side, TH) for j in range(NV + 1)] for i in range(NU + 1)]
        b.grid(top, M_THATCH, True, flip=(side < 0))
        b.grid(bot, M_THATCH, True, flip=(side > 0))
        # Eave edge and gable edges (thickness strips).
        for i in range(NU):
            q = [top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]]
            b.face([b.vert(p) for p in (q if side > 0 else q[::-1])], [(0, 0), (0.5, 0), (0.5, 0.12), (0, 0.12)], M_THATCH)
        for i in (0, NU):
            for j in range(NV):
                q = [top[i][j], top[i][j + 1], bot[i][j + 1], bot[i][j]]
                if (i == 0) == (side > 0):
                    q = q[::-1]
                b.face([b.vert(p) for p in q], [(0, 0), (0.5, 0), (0.5, 0.12), (0, 0.12)], M_THATCH)
    # Leaning gable walls (woven) under the roof ends.
    for sgn in (-1, 1):
        rz = ridge_z(sgn * XR) - TH
        apex = V(sgn * (XR - 0.25), 0, rz - 0.1)
        pts = [V(sgn * 3.0, -1.95, WZ1), V(sgn * 3.0, 1.95, WZ1), V(sgn * (XR - 0.9), 1.0, rz - 1.0), apex, V(sgn * (XR - 0.9), -1.0, rz - 1.0)]
        ids = [b.vert(p) for p in pts]
        uv = [(p.y * 0.7, p.z * 0.7) for p in pts]
        order = [0, 1, 2, 3, 4] if sgn > 0 else [4, 3, 2, 1, 0]
        b.face([ids[k] for k in order], [uv[k] for k in order], M_WOVEN, False)
    # Ridge pole with upswept horn ends (bamboo), and ridge cap.
    rp = [V(x, 0, ridge_z(x) + 0.08) for x in [-XR + 2 * XR * i / 16 for i in range(17)]]
    b.tube(rp, [0.09] * len(rp), M_BAMBOO, 8, 1, 1 / 1.2)
    for sgn in (-1, 1):
        x0 = sgn * XR
        horn = [V(x0 - sgn * 0.3, 0, ridge_z(x0) - 0.05), V(x0 + sgn * 0.2, 0, ridge_z(x0) + 0.18), V(x0 + sgn * 0.38, 0, ridge_z(x0) + 0.5), V(x0 + sgn * 0.34, 0, ridge_z(x0) + 0.78)]
        b.tube(horn, [0.1, 0.09, 0.07, 0.05], M_BAMBOO, 8, 1, 1 / 1.2)
    # Rafter battens visible under the eaves.
    for i in range(-6, 7):
        x = i * 0.6
        b.tube([roof_pt(x / XE, 0.0, 1, TH + 0.02), roof_pt(x / XE, 0.55, 1, TH + 0.02)], [0.04, 0.04], M_BAMBOO, 5, 1, 1, cap=False)
        b.tube([roof_pt(x / XE, 0.0, -1, TH + 0.02), roof_pt(x / XE, 0.55, -1, TH + 0.02)], [0.04, 0.04], M_BAMBOO, 5, 1, 1, cap=False)
    # Ladder to the porch.
    for y in (-0.32, 0.32):
        b.tube([V(-5.4, y, -0.1), V(-4.55, y, FZ + 0.25)], [0.05, 0.045], M_BAMBOO, 6, 1, 1 / 1.2)
    for k in range(1, 6):
        t = k / 6
        p = V(-5.4, 0, -0.1).lerp(V(-4.55, 0, FZ + 0.25), t)
        b.tube([p + V(0, -0.34, 0), p + V(0, 0.34, 0)], [0.035, 0.035], M_HEWN, 5, 1, 1)
    # Firewood stack under the floor.
    for k in range(7):
        z = 0.1 + (k // 4) * 0.16
        y = -0.6 + (k % 4) * 0.17 + (k // 4) * 0.08
        b.tube([V(0.4, y, z), V(1.9, y + rng.uniform(-0.05, 0.05), z)], [0.075, 0.07], M_HEWN, 6, 1, 0.8, jitter=0.1, seed=k)
    ob = b.build("nha_san", [M["hewn"], M["planks"], M["woven"], M["thatch"], M["bamboo"]])
    return ob


def jetty(M):
    """Cầu tre: one 3 m module along +Y (north), deck top at z = 0.02, posts down to -1.8 m."""
    b = MB()
    BAM, PLK, WOV = 0, 1, 2
    rng = random.Random(5)
    for x in (-0.85, 0.85):
        for y in (0.0, 1.5, 3.0):
            b.tube([V(x + rng.uniform(-0.04, 0.04), y, -1.9), V(x, y, 0.25 + rng.uniform(0, 0.25))], [0.065, 0.06], BAM, 8, 1, 1 / 1.2, seed=int(y * 3 + x * 7))
            b.tube([V(x, y, -0.02), V(x, y, 0.09)], [0.075, 0.075], WOV, 8, 0.25, 1, cap=False)  # rattan lashing
        b.tube([V(x, -0.15, -0.09), V(x, 3.15, -0.09)], [0.055, 0.055], BAM, 7, 1, 1 / 1.2)
    for y in (0.0, 1.5, 3.0):
        b.tube([V(-1.0, y, -0.15), V(1.0, y, -0.15)], [0.05, 0.05], BAM, 7, 1, 1 / 1.2)
    n = 13
    for k in range(n):
        y = 0.12 + k * (2.9 / (n - 1))
        rot = Matrix.Rotation(rng.uniform(-0.03, 0.03), 3, "Z") @ Matrix.Rotation(rng.uniform(-0.02, 0.02), 3, "Y")
        b.box(V(rng.uniform(-0.03, 0.03), y, -0.01 + rng.uniform(-0.008, 0.008)), V(1.9 + rng.uniform(-0.1, 0.1), 0.2, 0.05), PLK, rot, 0.5, "x")
    return b.build("cau_tre", [M["bamboo"], M["planks"], M["woven"]])


def stakes(M):
    out = []
    b = MB()
    pts = [V(0, 0, -0.3), V(0.01, 0, 0.6), V(0, 0.01, 1.15)]
    b.tube(pts, [0.085, 0.08, 0.075], 0, 7, 1, 0.6, cap=False, jitter=0.1, seed=1)
    tip = b.vert(V(0.0, 0.0, 1.45))
    ring = [V(0.075 * math.cos(2 * math.pi * k / 7), 0.075 * math.sin(2 * math.pi * k / 7), 1.15) for k in range(8)]
    for k in range(7):
        b.face([b.vert(ring[k]), b.vert(ring[k + 1]), tip], [(k / 7, 0), ((k + 1) / 7, 0), (k / 7 + 0.07, 0.3)], 0)
    out.append(b.build("coc_nhon", [M["hewn"]]))
    b = MB()
    b.tube([V(0, 0, -0.3), V(0, 0, 0.35), V(0.02, 0, 0.62)], [0.1, 0.095, 0.09], 0, 8, 1, 0.6, cap=False, jitter=0.12, seed=2)
    rng = random.Random(4)
    ring = [V(0.02 + 0.09 * math.cos(2 * math.pi * k / 8), 0.09 * math.sin(2 * math.pi * k / 8), 0.62) for k in range(9)]
    c = b.vert(V(0.02, 0, 0.62))
    for k in range(8):
        sp = [ring[k], ring[k + 1]]
        hi = [p + V(0, 0, rng.uniform(0.0, 0.22)) for p in sp]
        b.face([b.vert(sp[0]), b.vert(sp[1]), b.vert(hi[1]), b.vert(hi[0])], [(k / 8, 0), ((k + 1) / 8, 0), ((k + 1) / 8, 0.15), (k / 8, 0.15)], 0)
        b.face([b.vert(hi[0]), b.vert(hi[1]), c], [(0, 0), (0.1, 0), (0.05, 0.1)], 0)
    out.append(b.build("coc_gay", [M["hewn"]]))
    b = MB()
    b.tube([V(0, 0, -0.6), V(0.02, 0, 0.8), V(0, 0.02, 1.55)], [0.13, 0.12, 0.11], 0, 9, 1, 0.6, jitter=0.08, seed=3)
    for z in (1.05, 1.12, 1.19):
        b.tube([V(0, 0, z - 0.03), V(0, 0, z + 0.03)], [0.135, 0.135], 1, 9, 0.25, 1, cap=False)
    out.append(b.build("coc_ben", [M["hewn"], M["woven"]]))
    return out


def dugout(M):
    """Thuyền độc mộc: 5.6 m hollowed log, bow +Y. Gunwale at z = 0.3, keel at z = -0.15."""
    b = MB()
    NT, NA = 30, 12
    L, B, D = 2.8, 0.38, 0.42

    def half_beam(t):
        return B * max(0.0, 1 - abs(t) ** 2.6) ** 0.55

    def top(t):
        return 0.3 + 0.16 * abs(t) ** 3

    outer, inner = [], []
    for i in range(NT + 1):
        t = -1 + 2 * i / NT
        bw, tp = half_beam(t), top(t)
        dep = D * max(0.0, 1 - abs(t) ** 3) ** 0.5 + 0.02
        bi, di = max(0.0, bw - 0.055), max(0.0, dep - 0.07)
        if abs(t) > 0.86:
            bi, di = 0.0, 0.0
        oc, ic = [], []
        for k in range(NA + 1):
            th = math.pi * k / NA
            n = noise.noise(V(t * 3, th, 0.5)) * 0.008
            oc.append(V(bw * math.cos(th) * (1 + n), t * L, tp - dep * math.sin(th)))
            ic.append(V(bi * math.cos(th), t * L, tp - 0.01 - di * math.sin(th)))
        outer.append(oc)
        inner.append(ic)
    b.grid(outer, 0, True, flip=True)
    b.grid(inner, 1, True)
    for i in range(NT):
        for k in (0, NA):
            q = [outer[i][k], outer[i + 1][k], inner[i + 1][k], inner[i][k]]
            if k == NA:
                q = q[::-1]
            b.face([b.vert(p) for p in q], [(0, i * 0.2), (0, (i + 1) * 0.2), (0.06, (i + 1) * 0.2), (0.06, i * 0.2)], 0)
    for i in (0, NT):
        for k in range(NA):
            q = [outer[i][k], outer[i][k + 1], inner[i][k + 1], inner[i][k]]
            if i == NT:
                q = q[::-1]
            b.face([b.vert(p) for p in q], [(0, 0), (0.1, 0), (0.1, 0.1), (0, 0.1)], 0, False)
    # Thwart and a paddle resting inside.
    b.box(V(0, -0.9, 0.2), V(0.62, 0.16, 0.05), 0, uv_scale=0.6, along="x")
    b.tube([V(-0.12, -1.9, 0.18), V(0.1, 1.2, 0.26)], [0.025, 0.025], 0, 6, 1, 0.5)
    b.box(V(0.12, 1.45, 0.27), V(0.17, 0.55, 0.025), 0, Matrix.Rotation(0.07, 3, "Z"), 0.6, "y")
    return b.build("thuyen_doc_moc", [M["hewn"], M["hewn_in"]])


def kiln(M, name, r0, h, ruined, seed):
    """Earthen dome kiln/furnace (clay, coarse). ruined: crown broken open and front collapsed."""
    b = MB()
    prof = []
    for k in range(13):
        t = k / 12
        prof.append((r0 * (1 - 0.82 * t ** 1.6) + (0.04 if k == 0 else 0), h * math.sin(t * math.pi / 2)))
    prof.append((r0 * 0.15, h * 1.03))
    rng = random.Random(seed)

    def cut(th, z):
        door = abs(((th - 0.0 + math.pi) % (2 * math.pi)) - math.pi) < 0.32 and z < h * 0.45
        if not ruined:
            return door
        crown = z > h * (0.62 + 0.25 * max(0.0, math.cos(th * 2 + 1.0))) and (math.cos(th - 2.2) > -0.2)
        return door or crown or (abs(((th + 0.0 + math.pi) % (2 * math.pi)) - math.pi) < 0.6 and z < h * 0.6 + 0.3 * math.cos(th * 5))

    b.lathe(prof, 0, seg=28, noise_amp=0.08 if ruined else 0.04, seed=seed, cut=cut)
    inner = [(max(0.05, r - 0.28), z - 0.02) for r, z in prof[:-1]]
    ids = b.lathe(inner, 0, seg=28, noise_amp=0.05, seed=seed + 1, cut=cut)
    # Flip inner faces (they were built facing out).
    n_inner = (28) * (len(inner) - 1)
    for fi in range(len(b.f) - n_inner, len(b.f)):
        if fi >= 0:
            b.f[fi] = b.f[fi][::-1]
            b.uv[fi] = b.uv[fi][::-1]
    # Rubble chunks.
    for k in range(12 if ruined else 3):
        a = rng.uniform(-0.9, 0.9)
        d = r0 * rng.uniform(0.9, 1.5)
        s = rng.uniform(0.2, 0.5)
        b.box(V(math.cos(a) * d, math.sin(a) * d, s * 0.25), V(s, s * 0.8, s * 0.5), 0, Matrix.Rotation(rng.uniform(0, 3), 3, "Z") @ Matrix.Rotation(rng.uniform(-0.4, 0.4), 3, "X"), 0.8)
    if not ruined:
        b.tube([V(-r0 * 0.3, 0, h * 0.9), V(-r0 * 0.35, 0, h + 0.9)], [0.28, 0.22], 0, 10, 2, 0.8, jitter=0.05, seed=seed + 3)
    return b.build(name, [M["clay"]])


def jar(M):
    b = MB()
    prof = [(0.0, 0.0), (0.42, 0.0), (0.55, 0.12), (0.68, 0.45), (0.72, 0.75), (0.66, 0.98), (0.6, 1.06), (0.63, 1.1), (0.58, 1.1), (0.55, 1.02), (0.6, 0.78), (0.55, 0.4), (0.38, 0.1), (0.0, 0.08)]
    b.lathe(prof, 0, seg=28, uv_u=2.0, noise_amp=0.012, seed=9)
    return b.build("thap_gom", [M["clay_dark"]])


def drum(M):
    b = MB()
    prof = [(0.82, 0.3), (0.9, 0.6), (0.92, 0.9), (0.9, 1.2), (0.84, 1.5)]
    b.lathe(prof, 0, seg=28, uv_u=3.0)
    b.lathe([(0.0, 1.52), (0.86, 1.52), (0.88, 1.47)], 1, seg=28, uv_u=1.0)
    b.lathe([(0.8, 0.28), (0.0, 0.28)], 0, seg=28, uv_u=1.0)
    for k in range(16):
        a = 2 * math.pi * k / 16
        b.tube([V(0.86 * math.cos(a), 0.86 * math.sin(a), 1.47), V(0.9 * math.cos(a), 0.9 * math.sin(a), 1.25)], [0.015, 0.015], 2, 4, 0.2, 1, cap=False)
    for a in (0.4, 2.5, 4.6):
        b.tube([V(0.7 * math.cos(a), 0.7 * math.sin(a), 0.3), V(0.85 * math.cos(a), 0.85 * math.sin(a), -0.05)], [0.07, 0.06], 0, 6, 1, 1)
    return b.build("trong_go", [M["hewn"], M["hide"], M["woven"]])


def chest(M):
    b = MB()
    b.box(V(0, 0, 0.25), V(0.9, 0.6, 0.5), 0, uv_scale=1.2)
    for x in (-0.3, 0, 0.3):
        b.box(V(x, 0, 0.26), V(0.05, 0.62, 0.52), 1, uv_scale=0.8, along="z")
    body = b.build("ruong_may", [M["woven"], M["bamboo"]])
    b = MB()
    b.box(V(0, 0.3, 0.06), V(0.94, 0.64, 0.12), 0, uv_scale=1.2)
    lid = b.build("ruong_may_nap", [M["woven"]])
    return [body, lid]


# ----------------------------------------------------------------------------------------- nature (Poly Haven)
def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def nature(M):
    dl = A.dl
    out = []

    def imp(mid, targets, lod=None, alpha=False, img_size=None):
        obs = [o for o in import_gltf(os.path.join(dl, "models", mid, f"{mid}_1k.gltf")) if o.type == "MESH"]
        for o in sorted(obs, key=lambda x: x.name):
            o.parent = None
            o.matrix_world = o.matrix_world.copy()
            t0 = tris(o)
            tgt = targets.get("*", targets.get(o.name))
            if tgt:
                decimate(o, min(1.0, tgt / max(1, t0)))
            o.name = o.name.replace(".", "_")
            print(f"  {mid}: {o.name} {t0} -> {tris(o)} tris")
            if lod:
                l1 = lod_copy(o, lod)
                out.append(l1)
            out.append(o)
        for o in obs:
            for slot in o.material_slots:
                m = slot.material
                if not m or m.get("_fixed"):
                    continue
                m["_fixed"] = True
                m.name = mid
                for n in m.node_tree.nodes:
                    if n.type == "TEX_IMAGE" and n.image and img_size and n.image.size[0] > img_size:
                        n.image.scale(img_size, img_size)
                if alpha:
                    bsdf = m.node_tree.nodes.get("Principled BSDF")
                    for n in m.node_tree.nodes:
                        if n.type == "TEX_IMAGE" and n.image and "diff" in n.image.name:
                            n.image = image(os.path.join(A.tex, f"{mid}_diffa.png"))
                            if img_size:
                                n.image.scale(img_size, img_size)
                            m.node_tree.links.new(n.outputs["Alpha"], bsdf.inputs["Alpha"])
        return obs

    imp("rock_moss_set_01", {"*": 1200}, lod=0.3)
    imp("dead_tree_trunk", {"*": 3000}, lod=0.25)
    imp("tree_stump_01", {"*": 1500}, lod=0.3)
    imp("shrub_03", {"*": 600}, alpha=True, img_size=1024)
    imp("fern_02", {"*": 500}, alpha=True, img_size=512)
    imp("weed_plant_02", {"*": 320}, alpha=True, img_size=512)
    imp("dry_branches_medium_01", {"*": 700}, img_size=512)
    out.append(fig_tree(M))
    return out


def fig_tree(M):
    """Self-made broad tree (cây sung-like): bark trunk with a low fork (nest spot ~2.3 m), leaf clumps are
    linked duplicates of the CC0 shrub_03 meshes (shared mesh data -> one glTF mesh, many nodes)."""
    b = MB()
    rng = random.Random(21)
    trunk = [V(0, 0, -0.3), V(0.05, 0.02, 0.8), V(0.12, -0.03, 1.7), V(0.15, 0.0, 2.3)]
    b.tube(trunk, [0.42, 0.33, 0.28, 0.26], 0, 12, 2.0, 0.5, jitter=0.07, seed=1)
    for a in range(5):  # root flare
        ang = a * 2 * math.pi / 5 + 0.3
        b.tube([V(0.38 * math.cos(ang), 0.38 * math.sin(ang), 0.35), V(0.85 * math.cos(ang), 0.85 * math.sin(ang), -0.05)], [0.16, 0.08], 0, 7, 1, 0.5, seed=a)
    tips = []

    def branch(p, d, length, r, depth):
        pts = [p]
        for k in range(1, 5):
            d = (d + V(rng.uniform(-0.25, 0.25), rng.uniform(-0.25, 0.25), rng.uniform(-0.1, 0.2))).normalized()
            pts.append(pts[-1] + d * length / 4)
        b.tube(pts, [r * (1 - 0.5 * k / 4) for k in range(5)], 0, 9 if depth == 0 else 6, 1.5, 0.6, cap=False, seed=depth * 7 + len(tips))
        if depth < 2:
            for _ in range(2 if depth == 0 else 3):
                branch(pts[-1], (d + V(rng.uniform(-0.8, 0.8), rng.uniform(-0.8, 0.8), 0.3)).normalized(), length * 0.62, r * 0.5, depth + 1)
        else:
            tips.append(pts[-1])
        if depth == 1:
            tips.append(pts[2])

    for ang, el in ((0.4, 0.75), (2.4, 0.6), (4.3, 0.7)):
        branch(V(0.15, 0, 2.3), V(math.cos(ang) * (1 - el), math.sin(ang) * (1 - el), el).normalized(), 2.8, 0.2, 0)
    tree = b.build("cay_sung", [M["bark"]])
    shrubs = [o for o in bpy.data.objects if o.name.startswith("shrub_03_") and not o.name.endswith("LOD1")]
    for k, tp in enumerate(tips):
        src = shrubs[k % len(shrubs)]
        c = src.copy()  # linked duplicate: shares mesh data
        c.name = f"cay_sung_leaf_{k:02d}"
        bpy.context.scene.collection.objects.link(c)
        c.parent = tree
        s = rng.uniform(5.0, 7.0)
        c.matrix_world = Matrix.Translation(tp + V(0, 0, -0.9)) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Diagonal((s, s, s * 0.8, 1))
    print(f"  cay_sung: {tris(tree)} trunk tris, {len(tips)} leaf clumps")
    return tree


# ----------------------------------------------------------------------------------------- cards (Cycles)
def emission_mat(name, rgb, ao=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    col = nt.nodes.new("ShaderNodeAttribute")
    col.attribute_name = "Col"
    col.attribute_type = "GEOMETRY"
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    mul.inputs[6].default_value = (*rgb, 1)
    nt.links.new(col.outputs["Color"], mul.inputs[7])
    if ao:
        aon = nt.nodes.new("ShaderNodeAmbientOcclusion")
        aon.inputs["Distance"].default_value = 0.12
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 0.6
        nt.links.new(mul.outputs[2], mix.inputs[6])
        nt.links.new(aon.outputs["AO"], mix.inputs[7])
        nt.links.new(mix.outputs[2], em.inputs["Color"])
    else:
        nt.links.new(mul.outputs[2], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def ribbon(b, pts, widths, mat, twist=0.0):
    """Flat leaf/blade ribbon along pts (normal ~ view direction -Y so cards read well)."""
    n = len(pts)
    P = []
    for i in range(n):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(V(0, 1, 0))
        if side.length < 1e-4:
            side = V(1, 0, 0)
        side = side.normalized()
        side = (Matrix.Rotation(twist * i / max(1, n - 1), 3, t) @ side)
        w = widths[i] / 2
        P.append([pts[i] - side * w, pts[i] + side * w])
    rows = [[P[i][j] for i in range(n)] for j in range(2)]
    b.grid(rows, mat, True, lambda j, i: (j, i / (n - 1)))


def set_vcol(ob, fn):
    me = ob.data
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            attr.data[li].color = (*fn(v), 1.0)


def reed_clump(seed, dry):
    rng = random.Random(seed)
    stem, leaf, plume = MB(), MB(), MB()
    H = 2.75
    for s in range(rng.randint(9, 13)):
        x0 = rng.uniform(-0.12, 0.12)
        h = rng.uniform(1.7, H)
        lean = rng.uniform(-0.12, 0.28)
        pts = [V(x0 + lean * (k / 6) ** 2 * h / 2, rng.uniform(-0.05, 0.05), h * k / 6) for k in range(7)]
        stem.tube(pts, [0.008 - 0.004 * k / 6 for k in range(7)], 0, 5, 1, 1, cap=False)
        for lf in range(rng.randint(3, 5)):
            k0 = rng.uniform(0.15, 0.7)
            base = pts[0].lerp(pts[-1], k0)
            ln = rng.uniform(0.45, 0.85)
            reach = max(0.05, 0.33 - abs(base.x))
            side = rng.choice((-1, 1))
            dirx = side * min(rng.uniform(0.25, 0.8), reach / (ln * 0.5))
            droop = rng.uniform(0.3, 0.8)
            lp = [base + V(dirx * ln * (k / 9) * 0.5, 0, ln * (k / 9) * (1 - droop * (k / 9))) for k in range(10)]
            ribbon(leaf, lp, [0.024 * (1 - (k / 9) ** 1.5) + 0.002 for k in range(10)], 0, twist=rng.uniform(-0.35, 0.35))
        if dry or rng.random() < 0.45:
            # Feathery panicle: the stem tip bends to one side; short strands along the top 40 cm.
            top = pts[-1]
            bend = rng.choice((-1, 1)) * rng.uniform(0.25, 0.6)
            rach = [top + V(bend * 0.12 * (q / 6) ** 1.6, 0, -0.42 * (1 - q / 6) * 0.0 + 0.36 * (q / 6) * (1 - 0.35 * (q / 6))) for q in range(7)]
            for q in range(6):
                stem.tube([rach[q], rach[q + 1]], [0.004, 0.003], 0, 4, 1, 1, cap=False)
            for k in range(rng.randint(55, 75)):
                t = rng.uniform(0.05, 1.0)
                q = min(5, int(t * 6))
                p0 = rach[q].lerp(rach[q + 1], t * 6 - q)
                ln = 0.06 + 0.12 * (1 - t) ** 0.7 * rng.uniform(0.6, 1.0)
                ang = rng.uniform(0.25, 0.75) * rng.choice((-1, 1)) + bend * 0.6
                d = V(math.sin(ang), 0, math.cos(ang))
                pp = [p0 + d * ln * (u / 3) + V(0, rng.uniform(-0.01, 0.01), -0.02 * (u / 3) ** 2) for u in range(4)]
                ribbon(plume, pp, [0.004, 0.009, 0.008, 0.002], 0)
    return stem, leaf, plume


def grass_clump(seed, dry):
    rng = random.Random(seed)
    g = MB()
    for k in range(rng.randint(26, 40)):
        x0 = rng.gauss(0, 0.07)
        h = rng.uniform(0.25, 0.62)
        bend = rng.uniform(-0.6, 0.6)
        pts = [V(x0 + bend * h * (q / 5) ** 2 * 0.6, rng.uniform(-0.03, 0.03), h * (q / 5) * (1 - 0.25 * (q / 5) ** 2 * abs(bend))) for q in range(6)]
        for p in pts:
            p.x = max(-0.3, min(0.3, p.x))
        ribbon(g, pts, [0.012 * (1 - q / 5) + 0.001 for q in range(6)], 0, twist=rng.uniform(-1, 1))
    return g


def render_cards(outdir, kind):
    from PIL import Image  # pillow in the bpy venv

    scn = bpy.context.scene
    for o in list(scn.collection.objects):
        o.hide_render = True
    col = bpy.data.collections.new("cards_" + kind)
    scn.collection.children.link(col)
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = 24
    scn.cycles.use_denoising = False
    scn.render.film_transparent = True
    scn.view_settings.view_transform = "Standard"
    scn.view_settings.look = "None"
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"
    world = bpy.data.worlds.new("cards") if not scn.world else scn.world
    scn.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    cam_data = bpy.data.cameras.new("cardcam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("cardcam", cam_data)
    col.objects.link(cam)
    scn.camera = cam
    cam.rotation_euler = (math.pi / 2, 0, 0)  # looks along +Y
    tiles = []
    variants = [(1, False), (2, False), (3, True), (4, True)]
    for vi, (seed, dry) in enumerate(variants):
        for o in list(col.objects):
            if o != cam:
                bpy.data.objects.remove(o)
        if kind == "reed":
            stem, leaf, plume = reed_clump(seed + 10, dry)
            green, tan = (0.42, 0.47, 0.25), (0.72, 0.6, 0.38)
            c_leaf = tan if dry else green
            obs = [stem.build("stem", [emission_mat("m_stem", (0.62, 0.6, 0.38) if dry else (0.45, 0.5, 0.27))], col),
                   leaf.build("leaf", [emission_mat("m_leaf", c_leaf)], col)]
            if plume.f:
                obs.append(plume.build("plume", [emission_mat("m_plume", (0.85, 0.8, 0.68))], col))
            H, Wd, res = 3.2, 0.8, (256, 1024)
        else:
            g = grass_clump(seed + 30, dry)
            obs = [g.build("grass", [emission_mat("m_grass", (0.66, 0.6, 0.38) if dry else (0.42, 0.5, 0.26))], col)]
            H, Wd, res = 0.66, 0.66, (256, 256)
        rng = random.Random(seed)
        for o in obs:
            jit = rng.uniform(0.85, 1.1)
            set_vcol(o, lambda v, j=jit: tuple(min(1.0, (0.55 + 0.45 * min(1.0, v.z / (H * 0.7))) * j * c) for c in (1.0, 1.0, 0.97)))
        cam.location = (0, -5, H / 2 - 0.02)
        cam_data.ortho_scale = max(H, Wd)
        scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.resolution_percentage = 100
        path = os.path.join(A.work, f"card_{kind}_{vi}.png")
        scn.render.filepath = path
        bpy.ops.render.render(write_still=True)
        tiles.append(path)
    ims = [Image.open(p).convert("RGBA") for p in tiles]
    w, h = ims[0].size
    atlas = Image.new("RGBA", (w * len(ims), h), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        atlas.paste(im, (i * w, 0))
    # Bleed colour into transparent texels so mip-mapped edges do not go dark.
    from PIL import ImageFilter
    rgb = atlas.convert("RGB")
    a = atlas.getchannel("A")
    fill = rgb
    for _ in range(6):
        fill = fill.filter(ImageFilter.MaxFilter(3))
    base = Image.composite(rgb, fill, a.point(lambda x: 255 if x > 8 else 0))
    base.putalpha(a)
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, f"{kind}_atlas.webp")
    base.save(out, "WEBP", quality=86, method=6)
    print("card atlas", out, os.path.getsize(out))
    for o in list(col.objects):
        bpy.data.objects.remove(o)
    for o in scn.collection.objects:
        o.hide_render = False


# ----------------------------------------------------------------------------------------- export / preview
def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
        for c in o.children_recursive:
            c.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_image_format="WEBP",
                              export_image_quality=80, export_yup=True, export_apply=True, export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print("exported", path, os.path.getsize(path))


def preview(objs, path):
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.samples = 48
    scn.cycles.use_denoising = False
    scn.render.film_transparent = False
    scn.view_settings.view_transform = "AgX"
    world = scn.world or bpy.data.worlds.new("w")
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = image(os.path.join(A.dl, "hdris", "overcast_soil_puresky_2k.hdr"))
    world.node_tree.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(55), 0, math.radians(-40))
    scn.collection.objects.link(sun)
    ground = MB()
    ground.box(V(0, 0, -0.05), V(60, 60, 0.1), 0)
    g = ground.build("preview_ground", [pbr("prev_ground", "#5a4c38", 0.9)])
    layout = {"nha_san": (0, 6, 0), "cau_tre": (-9, -2, 0), "thuyen_doc_moc": (-6, -3, 0.4), "lo_bo_hoang": (9, 6, 0), "lo_duc": (10, -4, 0),
              "coc_nhon": (-3, -4, 0), "coc_gay": (-2.4, -4, 0), "coc_ben": (-1.6, -4, 0), "thap_gom": (1.5, -4, 0), "trong_go": (3.5, -4, 0),
              "ruong_may": (5.5, -4, 0), "cay_sung": (-12, 8, 0), "dead_tree_trunk": (2, -9, 0), "tree_stump_01": (-2, -9, 0),
              "rock_moss_set_01_rock01": (5, -9, 0), "rock_moss_set_01_rock03": (7, -9, 0), "fern_02_a": (-4, -7, 0), "shrub_03_a": (-6, -8, 0),
              "weed_plant_02_a_LOD0": (0, -7, 0), "dry_branches_medium_01_a": (3, -7, 0)}
    saved = {}
    shown = []
    for o in bpy.data.objects:
        if o.type != "MESH" or o.parent is not None or o == g:
            continue
        if o.name in layout:
            saved[o.name] = o.matrix_world.copy()
            o.location = layout[o.name]
            o.hide_render = False
            shown.append(o)
        else:
            o.hide_render = True
    cam = bpy.data.objects.new("pcam", bpy.data.cameras.new("pcam"))
    scn.collection.objects.link(cam)
    cam.location = (0, -26, 11)
    cam.rotation_euler = (math.radians(68), 0, 0)
    cam.data.lens = 30
    scn.camera = cam
    scn.render.resolution_x, scn.render.resolution_y = 1280, 720
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for n, m in saved.items():
        bpy.data.objects[n].matrix_world = m
    bpy.data.objects.remove(g)
    print("preview", path)


def main():
    global A
    ap = argparse.ArgumentParser()
    ap.add_argument("--dl", required=True, help="downloaded Poly Haven assets (fetch_polyhaven.py --out)")
    ap.add_argument("--tex", required=True, help="graded prop textures (prepare_textures.py <work>/props_tex)")
    ap.add_argument("--out", required=True, help="raw GLB output dir (compress next with compress_glb.mjs)")
    ap.add_argument("--cards", required=True, help="output dir of the reed/grass card atlases (webp)")
    ap.add_argument("--work", default=None)
    ap.add_argument("--preview", default=None, help="optional Cycles preview render (png)")
    A = ap.parse_args()
    A.work = A.work or A.out
    os.makedirs(A.work, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    M = {
        "hewn": pbr("hewn_wood", "hewn_wood"),
        "hewn_in": pbr("hewn_wood_inner", "hewn_wood", normal_strength=1.3),
        "planks": pbr("planks", "planks"),
        "woven": pbr("woven_bamboo", "woven_bamboo"),
        "thatch": pbr("thatch", "thatch", normal_strength=1.4),
        "bamboo": pbr("bamboo_culm", "bamboo_culm"),
        "bark": pbr("bark", "bark"),
        "clay": pbr("clay", "clay", normal_strength=1.5),
        "clay_dark": pbr("clay_jar", "#7d5f45", 0.85),
        "hide": pbr("hide", "#cdbb93", 0.75),
    }
    props = [stilt_house(M), jetty(M), *stakes(M), dugout(M), kiln(M, "lo_bo_hoang", 2.7, 2.5, True, 7),
             kiln(M, "lo_duc", 1.7, 2.1, False, 8), jar(M), drum(M), *chest(M)]
    props.append(lod_copy(props[0], 0.35, "nha_san_LOD1"))
    for o in props:
        print(f"  prop {o.name}: {tris(o)} tris")
    nat = nature(M)
    if A.preview:
        preview(props + nat, A.preview)
    export(props, os.path.join(A.out, "env_props.glb"))
    export([o for o in nat if o.parent is None], os.path.join(A.out, "env_nature.glb"))
    render_cards(A.cards, "reed")
    render_cards(A.cards, "grass")


if __name__ == "__main__":
    main()
