"""트윈 나선형 급속 냉동기 3D 모델 + 렌더 (Blender bpy / Cycles)

사용법:
  python3 freezer3d.py still   out.png           # 확인용 한 장 (영웅 컷 0번 프레임)
  python3 freezer3d.py hero    out_dir/          # 360° 궤도 180프레임, 제품이 나선을 따라 이동 (루프)
  python3 freezer3d.py close   out_dir/          # 드럼 A 벨트 클로즈업 90프레임 (루프)
  python3 freezer3d.py layout  out_dir/          # 공장 배치도: 위에서 → 3/4 시점으로 내려오는 카메라 120프레임
  python3 freezer3d.py vessel  out_dir/          # 압력용기 · 질소 용기 궤도 90프레임
  python3 freezer3d.py anchors out.json          # 각 컷의 라벨 2D 좌표 (렌더 없음)

환경변수 RES=가로x세로, SAMPLES=n, FRAMES=시작:끝 (일부 프레임만 렌더)
"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

MODE = sys.argv[1] if len(sys.argv) > 1 else "still"
OUT = sys.argv[2] if len(sys.argv) > 2 else "still.png"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------------- 재질 ----------------
def hexrgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1]

def mat(name, hexc, metal=0.0, rough=0.5, bumpy=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexc)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = hexrgb(hexc)
        b.inputs["Emission Strength"].default_value = emit
    if bumpy:  # 증발기 코일 핀 · 벨트 모듈 느낌의 줄무늬 범프
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (bumpy, bumpy, bumpy)
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.bands_direction = "X"
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.4
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
        nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

M_SS = mat("stainless", "#C9D0D5", 0.9, 0.28)
M_BELT = mat("belt", "#2D6AD2", 0.0, 0.42, bumpy=22)
M_RIM = mat("rim", "#B8C0C6", 0.85, 0.32)
M_EVAP = mat("evap", "#A7AFB4", 0.6, 0.4, bumpy=40)
M_FAN = mat("fan", "#1D2124", 0.3, 0.5)
M_DARK = mat("dark", "#33383C", 0.4, 0.45)
M_PANEL = mat("panel", "#E6E9EB", 0.1, 0.45)
M_FLOOR = mat("floorplate", "#8E979C", 0.7, 0.45, bumpy=60)
M_CONC = mat("concrete", "#9EA3A6", 0.0, 0.9)
M_WALL = mat("wall", "#DCE1E4", 0.0, 0.8)
M_PIPE = mat("pipe", "#E9EEF0", 0.1, 0.5)
M_PIPE2 = mat("pipe2", "#3E8E5E", 0.2, 0.5)
M_ORANGE = mat("orange", "#E58A1F", 0.1, 0.45)
M_RED = mat("red", "#C6463A", 0.1, 0.45)
M_GREEN = mat("green", "#3F7F5A", 0.2, 0.5)
M_GLASS = mat("gaugeface", "#F4F6F7", 0.0, 0.2)
PRODUCT_MATS = [mat(f"prod{i}", c, 0.0, 0.55 - i * 0.04) for i, c in enumerate(
    ["#E4A15F", "#E3B183", "#E1C3A8", "#DCD4CB", "#DCE4EA", "#E8F1F7"])]

# ---------------- 도형 도우미 ----------------
def finish(o, m, parent=None, bevel=0.0, smooth=True):
    o.data.materials.append(m)
    if bevel:
        mod = o.modifiers.new("bev", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    if parent:
        o.parent = parent
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o

def box(size, loc, m, rot=(0, 0, 0), parent=None, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, parent, bevel, smooth=False)

def cyl(r, depth, loc, m, rot=(0, 0, 0), parent=None, verts=40, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    return finish(bpy.context.object, m, parent, bevel)

def torus(R, r, loc, m, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=64, minor_segments=8)
    return finish(bpy.context.object, m, parent)

def tube(points, r, m, parent=None):
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (p[0], p[1], p[2], 1)
    o = bpy.data.objects.new("tube", cu)
    col.objects.link(o)
    o.data.materials.append(m)
    if parent:
        o.parent = parent
    return o

def rounded(p, rad=0.4):
    out = [p[0]]
    for i in range(1, len(p) - 1):
        a, b, c = Vector(p[i - 1]), Vector(p[i]), Vector(p[i + 1])
        d1, d2 = a - b, c - b
        r = min(rad, d1.length / 2, d2.length / 2)
        s, e = b + d1.normalized() * r, b + d2.normalized() * r
        for k in range(9):
            t = k / 8
            out.append(tuple((1 - t) ** 2 * s + 2 * (1 - t) * t * b + t ** 2 * e))
    out.append(p[-1])
    return out

def mesh_obj(name, verts, faces, m, parent=None, solid=0.0):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    if solid:
        mod = o.modifiers.new("solid", "SOLIDIFY")
        mod.thickness = solid
    return finish(o, m, parent)

# ---------------- 냉동기 치수 (m) ----------------
CA, CB = (-2.3, 0.0), (2.3, 0.0)      # 드럼 중심
R_DRUM = 1.15
R_IN, R_OUT = 1.2, 1.78               # 벨트 안쪽/바깥 반지름
R_MID = (R_IN + R_OUT) / 2
Z0, Z1 = 0.65, 3.45                   # 벨트 시작/끝 높이
TURNS = 10
EVAP_X = 4.95                          # 증발기 중심 |x|

def helix_pts(c, r, z0, z1, th0, sweep, step=3.0):
    n = max(2, int(abs(sweep) / step))
    return [(c[0] + r * math.cos(math.radians(th0 + sweep * i / n)),
             c[1] + r * math.sin(math.radians(th0 + sweep * i / n)),
             z0 + (z1 - z0) * i / n) for i in range(n + 1)]

def belt_strip(c, z0, z1, th0, sweep, name):
    inner = helix_pts(c, R_IN, z0, z1, th0, sweep)
    outer = helix_pts(c, R_OUT, z0, z1, th0, sweep)
    verts = inner + outer
    n = len(inner)
    faces = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    mesh_obj(name, verts, faces, M_BELT, solid=0.035)
    # 바깥 측판 (벨트 가장자리의 은색 띠)
    top = [(x, y, z + 0.09) for x, y, z in outer]
    faces2 = [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)]
    mesh_obj(name + "_rim", outer + top, faces2, M_RIM, solid=0.01)

# 제품 경로: 입구 컨베이어 → 드럼 A 상승 → 상부 브리지 → 드럼 B 하강 → 출구 컨베이어
SWEEP_A = TURNS * 360 - 90 + 0            # -90° 에서 시작해 0° 에서 끝 (B 쪽)
SWEEP_B = -(TURNS * 360 - 90)             # 180° 에서 시작해 -90° (앞쪽) 에서 끝
def build_path():
    p = []
    for k in range(40):
        p.append((CA[0], -5.2 + (5.2 - R_MID) * k / 40, Z0))
    p += helix_pts(CA, R_MID, Z0, Z1, -90, SWEEP_A, 2.0)
    for k in range(1, 30):
        x0, x1 = CA[0] + R_MID, CB[0] - R_MID
        p.append((x0 + (x1 - x0) * k / 30, 0, Z1))
    p += helix_pts(CB, R_MID, Z1, Z0, 180, SWEEP_B, 2.0)
    for k in range(1, 41):
        p.append((CB[0], -R_MID - (5.2 - R_MID) * k / 40, Z0))
    return [Vector(q) for q in p]

PATH = build_path()
CUM = [0.0]
for i in range(1, len(PATH)):
    CUM.append(CUM[-1] + (PATH[i] - PATH[i - 1]).length)
TOTAL = CUM[-1]

def path_at(d):
    d = d % TOTAL
    lo, hi = 0, len(CUM) - 1
    while lo < hi - 1:
        mid = (lo + hi) // 2
        if CUM[mid] <= d:
            lo = mid
        else:
            hi = mid
    t = (d - CUM[lo]) / max(1e-6, CUM[hi] - CUM[lo])
    a, b = PATH[lo], PATH[hi]
    return a.lerp(b, t), (b - a).normalized()

N_PROD = 140
SPACING = TOTAL / N_PROD
products, drums, fans = [], [], []

def build_freezer(ox=0.0, oy=0.0):
    root = bpy.data.objects.new("Freezer", None)
    col.objects.link(root)
    root.location = (ox, oy, 0)
    # 베이스 스키드 + 다리
    box((11.6, 4.4, 0.16), (0, 0, 0.32), M_FLOOR, parent=root, bevel=0.02)
    for x in (-5.4, -1.8, 1.8, 5.4):
        for y in (-2.0, 2.0):
            box((0.12, 0.12, 0.28), (x, y, 0.14), M_SS, parent=root)
    # 드럼 (회전 케이지)
    for c, nm in ((CA, "A"), (CB, "B")):
        e = bpy.data.objects.new(f"Drum{nm}", None)
        col.objects.link(e)
        e.location = (c[0], c[1], 0)
        e.parent = root
        for k in range(28):
            a = 2 * math.pi * k / 28
            cyl(0.03, 3.3, (R_DRUM * math.cos(a), R_DRUM * math.sin(a), 2.05), M_SS, parent=e, verts=8)
        for z in (0.45, 3.7):
            torus(R_DRUM, 0.05, (0, 0, z), M_SS, parent=e)
        cyl(0.12, 3.6, (0, 0, 2.1), M_DARK, parent=e)
        for k in range(6):
            a = math.pi * k / 3
            box((R_DRUM * 2, 0.06, 0.06), (0, 0, 3.7), M_SS, rot=(0, 0, a), parent=e)
        drums.append(e)
    # 나선 벨트
    belt_strip(CA, Z0, Z1, -90, SWEEP_A, "beltA")
    belt_strip(CB, Z1, Z0, 180, SWEEP_B, "beltB")
    # 상부 이송 브리지
    box((CB[0] - CA[0] - 2 * R_MID + 0.2, R_OUT - R_IN, 0.05), (0, 0, Z1 - 0.03), M_BELT, parent=root)
    # 프레임 기둥 · 상부 보
    for c in (CA, CB):
        for dx in (-1.95, 1.95):
            for dy in (-1.95, 1.95):
                box((0.1, 0.1, 3.6), (c[0] + dx, c[1] + dy, 2.2), M_SS, parent=root)
        for dy in (-1.95, 1.95):
            box((3.95, 0.1, 0.1), (c[0], dy, 4.0), M_SS, parent=root)
        for dx in (-1.95, 1.95):
            box((0.1, 3.95, 0.1), (c[0] + dx, 0, 4.0), M_SS, parent=root)
    # 증발기 + 팬
    for sx in (-1, 1):
        x = sx * EVAP_X
        box((1.1, 3.6, 3.5), (x, 0, 2.15), M_EVAP, parent=root, bevel=0.03)
        box((1.16, 3.66, 0.12), (x, 0, 3.95), M_DARK, parent=root)
        for fy in (-0.85, 0.85):
            for fz in (1.35, 2.95):
                fx = x + sx * 0.58
                torus(0.62, 0.035, (fx, fy, fz), M_DARK, rot=(0, math.radians(90), 0), parent=root)
                torus(0.42, 0.02, (fx + sx * 0.02, fy, fz), M_DARK, rot=(0, math.radians(90), 0), parent=root)
                hub = bpy.data.objects.new("fan", None)
                col.objects.link(hub)
                hub.location = (fx - sx * 0.05, fy, fz)
                hub.rotation_euler = (0, math.radians(90), 0)
                hub.parent = root
                cyl(0.1, 0.12, (0, 0, 0), M_FAN, parent=hub, verts=16)
                for k in range(5):
                    a = 2 * math.pi * k / 5
                    box((0.5, 0.16, 0.02), (0.27 * math.cos(a), 0.27 * math.sin(a), 0), M_FAN, rot=(0.3, 0, a), parent=hub, bevel=0.0)
                fans.append(hub)
    # 입구 · 출구 컨베이어
    for c in (CA, CB):
        y0, y1 = -5.4, -R_MID
        box((R_OUT - R_IN, y1 - y0, 0.05), (c[0], (y0 + y1) / 2, Z0 - 0.03), M_BELT, parent=root)
        for dx in (-0.33, 0.33):
            box((0.05, y1 - y0, 0.12), (c[0] + dx, (y0 + y1) / 2, Z0 - 0.02), M_SS, parent=root)
        for y in (-5.2, -3.6):
            for dx in (-0.3, 0.3):
                box((0.06, 0.06, Z0), (c[0] + dx, y, Z0 / 2), M_SS, parent=root)
    # 제어반
    box((0.9, 0.5, 1.9), (0.0, -2.9, 1.25), M_PANEL, parent=root, bevel=0.02)
    box((0.5, 0.02, 0.3), (0.0, -3.16, 1.7), M_DARK, parent=root)
    cyl(0.05, 0.04, (0.25, -3.17, 1.35), M_RED, rot=(math.radians(90), 0, 0), parent=root, verts=16)
    # 제품
    for i in range(N_PROD):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.object
        o.scale = (0.28, 0.18, 0.06)
        bpy.ops.object.transform_apply(scale=True)
        finish(o, PRODUCT_MATS[0], bevel=0.015, smooth=False)
        products.append(o)
    return root

def set_frame(t, loop):
    """t 프레임, loop 프레임 동안 제품이 한 칸(SPACING) 이동해 이음매 없이 반복"""
    shift = SPACING * (t % loop) / loop
    for i, o in enumerate(products):
        d = i * SPACING + shift
        p, tang = path_at(d)
        o.location = p + Vector((0, 0, 0.05))
        o.rotation_euler = (0, 0, math.atan2(tang.y, tang.x))
        frac = (d % TOTAL) / TOTAL
        k = min(len(PRODUCT_MATS) - 1, max(0, int((frac - 0.05) / 0.85 * len(PRODUCT_MATS))))
        o.material_slots[0].material = PRODUCT_MATS[k]
    ang = 2 * math.pi * (t % loop) / loop * (1 / 28) * 3   # 드럼: 막대 3칸만큼 → 루프 이음매 없음
    if drums:
        drums[0].rotation_euler = (0, 0, ang)
        drums[1].rotation_euler = (0, 0, -ang)
    for f in fans:
        f.rotation_euler = (f.rotation_euler.x, f.rotation_euler.y, 2 * math.pi * (t % loop) / loop * (2 / 5) * 5)

# ---------------- 공장 건물 (배치도용) ----------------
def build_building():
    # 바닥 슬래브
    box((34, 22, 0.2), (2, 0, -0.1), M_CONC, bevel=0.0)
    W_H = 2.4
    def wall(x0, y0, x1, y1, h=W_H, t=0.25):
        L = math.hypot(x1 - x0, y1 - y0)
        box((L, t, h), ((x0 + x1) / 2, (y0 + y1) / 2, h / 2), M_WALL, rot=(0, 0, math.atan2(y1 - y0, x1 - x0)), bevel=0.0)
    X0, X1, Y0, Y1 = -15, 19, -10, 10
    wall(X0, Y0, -2.5, Y0); wall(2.5, Y0, X1, Y0)          # 앞벽 (반입구 5m 개구부)
    wall(X0, Y1, X1, Y1); wall(X0, Y0, X0, Y1); wall(X1, Y0, X1, Y1)
    wall(-9, Y0, -9, -1.5); wall(-9, 1.5, -9, Y1)           # 전처리실 칸막이
    wall(10, Y0, 10, 0.5); wall(10, 3.5, 10, Y1)            # 기계실/포장실 칸막이
    wall(10, 4.5, X1, 4.5)
    # 기둥
    for x in (X0, -6.5, 2, 10.5, X1):
        for y in (Y0, 0, Y1):
            box((0.5, 0.5, W_H + 0.6), (x, y, (W_H + 0.6) / 2), M_DARK, bevel=0.0)
    # 기계실 장비: 압축기 2대 · 응축기
    for i, x in enumerate((12.5, 15.0)):
        box((1.8, 1.2, 1.3), (x, 7.6, 0.75), M_GREEN, bevel=0.04)
        cyl(0.35, 1.6, (x, 7.6, 1.75), M_SS, rot=(0, math.radians(90), 0), verts=24)
    box((3.4, 1.4, 1.8), (16.8, 5.8, 0.9), M_EVAP, bevel=0.03)
    for k in range(3):
        cyl(0.42, 0.06, (15.8 + k * 1.0, 5.8, 1.83), M_FAN, verts=24)
    # 냉매 배관 (기계실 → 증발기)
    for dz, m in ((0.0, M_PIPE), (0.28, M_PIPE2)):
        tube(rounded([(13.5, 6.8, 2.6 + dz), (13.5, 2.4, 2.6 + dz), (-EVAP_X - 1.3, 2.4, 2.6 + dz), (-EVAP_X - 1.3, 0.6, 2.6 + dz), (-EVAP_X - 0.6, 0.6, 2.6 + dz)], 0.6), 0.11, m)
        tube(rounded([(13.5, 2.4, 2.6 + dz), (EVAP_X + 1.3, 2.4, 2.6 + dz), (EVAP_X + 1.3, 0.6, 2.6 + dz), (EVAP_X + 0.6, 0.6, 2.6 + dz)], 0.6), 0.11, m)
    # 전기 패널
    box((1.2, 0.5, 2.0), (7.6, 3.6, 1.0), M_PANEL, bevel=0.02)
    box((0.9, 0.04, 0.5), (7.6, 3.34, 1.5), M_DARK)
    # 배수구
    for sx in (-1, 1):
        cyl(0.28, 0.03, (sx * EVAP_X, -2.6, 0.015), M_DARK, verts=24)
    # 전처리 라인 · 포장 라인 연결 컨베이어
    box((5.6, 0.58, 0.05), (CA[0] - 2.8 - 0.2, -5.4, Z0 - 0.03), M_BELT)
    box((6.8, 0.58, 0.05), (CB[0] + 3.4, -5.4, Z0 - 0.03), M_BELT)
    for x in (-9.5, -12.5):
        box((2.0, 1.2, 0.9), (x, -5.4, 0.45), M_SS, bevel=0.02)
    for x in (12.0, 15.5):
        box((2.2, 1.4, 1.1), (x, -5.4, 0.55), M_SS, bevel=0.02)
    # 반입 모듈 크레이트 (반입구 밖)
    box((4.2, 2.6, 2.2), (0, -13.0, 1.1), M_ORANGE, bevel=0.05)
    box((4.6, 3.0, 0.15), (0, -13.0, 0.08), M_DARK)

# ---------------- 압력용기 (가스 검사용) ----------------
def build_vessel():
    root = bpy.data.objects.new("Vessel", None)
    col.objects.link(root)
    # 기초 콘크리트 패드
    box((5.6, 2.4, 0.3), (0, 0, 0.15), M_CONC, bevel=0.02)
    # 몸체 (수평 원통 + 반구 헤드)
    L, R = 3.4, 0.62
    cyl(R, L, (0, 0, 1.25), M_SS, rot=(0, math.radians(90), 0), verts=64)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=R, location=(sx * L / 2, 0, 1.25), segments=64, ring_count=32)
        o = bpy.context.object
        o.scale = (0.55, 1, 1)
        bpy.ops.object.transform_apply(scale=True)
        finish(o, M_SS)
    # 새들 받침 + 앵커 볼트
    for sx in (-1, 1):
        x = sx * 1.1
        box((0.25, 1.3, 0.55), (x, 0, 0.58), M_DARK, bevel=0.02)
        box((0.6, 1.5, 0.05), (x, 0, 0.32), M_DARK)
        for dy in (-0.6, 0.6):
            for dx in (-0.2, 0.2):
                cyl(0.035, 0.22, (x + dx, dy, 0.42), M_ORANGE, verts=12)
                cyl(0.06, 0.04, (x + dx, dy, 0.38), M_ORANGE, verts=6)
    # 노즐 · 밸브 (핸드휠)
    for x, nm in ((-0.95, "valveIn"), (0.95, "valveOut")):
        cyl(0.07, 0.45, (x, 0, 1.25 + R + 0.2), M_SS, verts=20)
        box((0.32, 0.22, 0.22), (x, 0, 1.25 + R + 0.5), M_RED if nm == "valveOut" else M_DARK, bevel=0.03)
        cyl(0.03, 0.25, (x, 0, 1.25 + R + 0.72), M_SS, verts=12)
        torus(0.16, 0.022, (x, 0, 1.25 + R + 0.86), M_RED if nm == "valveOut" else M_DARK)
    # 압력계
    cyl(0.04, 0.35, (0, 0, 1.25 + R + 0.17), M_SS, verts=12)
    cyl(0.2, 0.08, (0, -0.02, 1.25 + R + 0.52), M_SS, rot=(math.radians(90), 0, 0), verts=40)
    cyl(0.18, 0.02, (0, -0.07, 1.25 + R + 0.52), M_GLASS, rot=(math.radians(90), 0, 0), verts=40)
    # 질소 용기 + 호스
    cyl(0.23, 1.5, (-3.4, 0.4, 0.75), M_GREEN, verts=40)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.23, location=(-3.4, 0.4, 1.5))
    finish(bpy.context.object, M_GREEN)
    cyl(0.06, 0.2, (-3.4, 0.4, 1.8), M_SS, verts=12)
    tube([(-3.4, 0.4, 1.9), (-3.2, 0.3, 2.4), (-2.4, 0.15, 2.6), (-1.5, 0.05, 2.45), (-0.95, 0, 2.2)], 0.025, M_DARK)
    return root

# ---------------- 조명 · 렌더 설정 ----------------
def light(kind, loc, energy, size=1.0, target=(0, 0, 1.5)):
    l = bpy.data.lights.new(kind, kind)
    l.energy = energy
    if kind == "AREA":
        l.size = size
    o = bpy.data.objects.new(kind, l)
    col.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

def setup_render(w, h):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = int(os.environ.get("SAMPLES", 10))
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.05
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 0
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.3
    scene.render.use_persistent_data = True
    r = os.environ.get("RES")
    scene.render.resolution_x, scene.render.resolution_y = (tuple(int(v) for v in r.split("x")) if r else (w, h))

world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.035, 0.06, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.2

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
col.objects.link(cam)
scene.camera = cam
cam_data.clip_end = 300

def aim(target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()

def ground(size=60):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    g = bpy.context.object
    g.is_shadow_catcher = True
    return g

def frames_range(n):
    r = os.environ.get("FRAMES")
    if r:
        a, b = (int(v) for v in r.split(":"))
        return range(a, min(b, n))
    return range(n)

def render_to(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def project(points):
    bpy.context.view_layer.update()
    out = {}
    for k, p in points.items():
        v = world_to_camera_view(scene, cam, Vector(p))
        out[k] = [round(v.x, 4), round(1 - v.y, 4)]
    return out

# 컷별 카메라
def hero_cam(i, n=180):
    a = math.radians(-38 - 360 * i / n)
    R, H = 17.5, 7.2
    cam.location = (R * math.sin(a), -R * math.cos(a), H)
    cam_data.lens = 38
    aim((0, 0, 1.7))

def close_cam():
    cam.location = (CA[0] - 1.2, -5.2, 2.2)
    cam_data.lens = 32
    aim((CA[0] + 0.2, -0.6, 2.0))

def layout_cam(i, n=120):
    t = i / (n - 1)
    t = t * t * (3 - 2 * t)
    top = Vector((2, -0.5, 46))
    side = Vector((-14, -30, 19))
    cam.location = top.lerp(side, t)
    cam_data.lens = 30
    tgt = Vector((2, 0, 0)).lerp(Vector((2.5, -0.5, 0.5)), t)
    d = tgt - cam.location
    if t < 0.02:
        cam.rotation_euler = (0, 0, 0)
    else:
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

def vessel_cam(i, n=90):
    a = math.radians(-28 - 50 * i / n)
    R, H = 8.5, 3.4
    cam.location = (R * math.sin(a), -R * math.cos(a), H)
    cam_data.lens = 40
    aim((-0.6, 0, 1.3))

FREEZER_PTS = {
    "drum": (CA[0] + 0.5, -0.4, 3.75),
    "belt": (CB[0] + R_OUT * 0.6, -R_OUT * 0.8, 2.0),
    "evapL": (-EVAP_X - 0.58, -0.85, 2.95),
    "evapR": (EVAP_X + 0.58, -0.85, 2.95),
    "infeed": (CA[0], -4.6, Z0),
    "outfeed": (CB[0], -4.6, Z0),
    "bridge": (0, 0, Z1),
    "panel": (0.0, -3.17, 1.8),
    "frame": (CB[0] + 1.95, -1.95, 4.0),
}
LAYOUT_PTS = {
    "freezer": (0, 0, 4.0),
    "clear": (-6.2, -3.4, 0.0),
    "prep": (-12, 3, 0),
    "pack": (14.5, -2, 0),
    "machine": (14, 7.6, 2.0),
    "pipe": (6, 2.4, 2.9),
    "elec": (7.6, 3.6, 2.0),
    "drain": (-EVAP_X, -2.6, 0.0),
    "door": (0, -10, 1.5),
    "crate": (0, -13, 2.2),
    "infeed": (-7.0, -5.4, 0.6),
    "outfeed": (8.5, -5.4, 0.6),
}
VESSEL_PTS = {
    "vessel": (0.6, -0.62, 1.25),
    "gauge": (0, -0.08, 1.25 + 0.62 + 0.52),
    "valveIn": (-0.95, 0, 1.25 + 0.62 + 0.86),
    "valveOut": (0.95, 0, 1.25 + 0.62 + 0.86),
    "anchor": (1.3, -0.6, 0.45),
    "anchor2": (-0.9, -0.6, 0.45),
    "n2": (-3.4, 0.17, 1.0),
    "pad": (2.4, -1.2, 0.3),
}

if True:
    if MODE == "vessel":
        build_vessel()
        ground(30)
        light("SUN", (5, -6, 10), 3.2, target=(0, 0, 0))
        light("AREA", (-6, -5, 5), 900, 6.0, target=(0, 0, 1.2))
        light("AREA", (3, 6, 6), 700, 5.0, target=(0, 0, 1.2))
        setup_render(1280, 720)
        os.makedirs(OUT, exist_ok=True)
        for i in frames_range(90):
            vessel_cam(i)
            render_to(os.path.join(OUT, f"v{i:03d}.png"))
        sys.exit(0)

    build_freezer()
    if MODE == "layout":
        build_building()
    g = ground(80 if MODE == "layout" else 60)
    if MODE == "layout":
        g.hide_render = True        # 콘크리트 슬래브가 바닥 역할
    light("SUN", (8, -10, 16), 3.0, target=(0, 0, 0))
    light("AREA", (-12, -10, 9), 6000, 10.0, target=(0, 0, 1.5))
    light("AREA", (10, 12, 10), 4000, 10.0, target=(0, 0, 1.5))
    setup_render(1280, 720)

    if MODE == "still":
        hero_cam(0)
        set_frame(0, 180)
        render_to(OUT)
    elif MODE == "hero":
        os.makedirs(OUT, exist_ok=True)
        for i in frames_range(180):
            hero_cam(i)
            set_frame(i, 180)
            render_to(os.path.join(OUT, f"h{i:03d}.png"))
    elif MODE == "close":
        os.makedirs(OUT, exist_ok=True)
        close_cam()
        for i in frames_range(90):
            set_frame(i, 90)
            render_to(os.path.join(OUT, f"c{i:03d}.png"))
    elif MODE == "layout":
        os.makedirs(OUT, exist_ok=True)
        set_frame(0, 180)
        for i in frames_range(120):
            layout_cam(i)
            render_to(os.path.join(OUT, f"l{i:03d}.png"))
    elif MODE == "anchors":
        data = {"hero": [], "close": None, "layout": [], "vessel": []}
        for i in range(180):
            hero_cam(i)
            data["hero"].append(project(FREEZER_PTS))
        close_cam()
        data["close"] = project(FREEZER_PTS)
        for i in range(120):
            layout_cam(i)
            data["layout"].append(project(LAYOUT_PTS))
        for i in range(90):
            vessel_cam(i)
            data["vessel"].append(project(VESSEL_PTS))
        with open(OUT, "w") as f:
            json.dump(data, f)
