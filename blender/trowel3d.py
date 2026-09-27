"""승용식 쌍발 트로웰 3D 모델 + 렌더 (Blender bpy / Cycles)

사용법:
  python3 trowel3d.py still   out.png        # 확인용 한 장
  python3 trowel3d.py turn    out_dir/       # 3/4뷰 360° 턴테이블 240프레임 (로터 회전)
  python3 trowel3d.py bottom  out_dir/       # 아래에서 본 로터 반대회전 루프 30프레임
  python3 trowel3d.py shots   out_dir/       # 영상용 클로즈업 컷 (레버·엔진·정면·위) + 로터 회전 루프
  python3 trowel3d.py anchors out.json       # 턴테이블/클로즈업 컷의 부품 라벨 2D 좌표 (렌더 없음)

환경변수 RES=가로x세로, SAMPLES=n 으로 해상도·샘플 수를, ONLY=rotor,top 으로 렌더할 컷을 고를 수 있음.
"""
import bpy, math, sys, os, json
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

MODE = sys.argv[1] if len(sys.argv) > 1 else "still"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/blender/still.png"
FRAME_ARG = int(sys.argv[3]) if len(sys.argv) > 3 else 0

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------------- 재질 ----------------
def hexrgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB -> linear
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1]

def mat(name, hexc, metal=0.0, rough=0.5, checker=False, emit=0.0):
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
    if checker:  # 체크판(줄무늬 돌기) 느낌의 범프
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (28, 28, 28)
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(45))
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.inputs["Scale"].default_value = 1.0
        wave.bands_direction = "X"
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.35
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
        nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

M_YEL = mat("yellow", "#E8900A", 0.1, 0.38)
M_RED = mat("red", "#C23A2B", 0.1, 0.4)
M_STEEL = mat("steel", "#9AA3A8", 0.85, 0.3)
M_DECK = mat("deck", "#8E969A", 0.8, 0.42, checker=True)
M_DARK = mat("dark", "#2A2D30", 0.5, 0.45)
M_BLACK = mat("black", "#141414", 0.0, 0.65)
M_LENS = mat("lens", "#FFFFFF", 0.0, 0.1, emit=3.0)
M_PLATE = mat("plate", "#E9ECEE", 0.2, 0.4)

# ---------------- 도형 도우미 ----------------
def finish(o, m, parent=None, bevel=0.0):
    o.data.materials.append(m)
    if bevel:
        mod = o.modifiers.new("bev", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    if parent:
        o.parent = parent
    for p in o.data.polygons:
        p.use_smooth = True
    if hasattr(o.data, "use_auto_smooth"):
        pass
    return o

def box(size, loc, m, rot=(0, 0, 0), parent=None, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o = finish(o, m, parent, bevel)
    for p in o.data.polygons:
        p.use_smooth = False
    return o

def cyl(r, depth, loc, m, rot=(0, 0, 0), parent=None, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    return finish(o, m, parent, 0.004)

def tube(points, r, m, cyclic=False, parent=None):
    cu = bpy.data.curves.new("tube", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 2
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (p[0], p[1], p[2], 1)
    sp.use_cyclic_u = cyclic
    o = bpy.data.objects.new("tube", cu)
    col.objects.link(o)
    o.data.materials.append(m)
    if parent:
        o.parent = parent
    return o

def arc(cx, cy, R, a0, a1, z, n=40):
    return [(cx + R * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + R * math.sin(math.radians(a0 + (a1 - a0) * i / n)), z) for i in range(n + 1)]

def rounded(p, rad=0.06):
    """꺾인 점 목록의 모서리를 둥글게 (튜브 프레임용)"""
    out = [p[0]]
    for i in range(1, len(p) - 1):
        a, b, c = Vector(p[i - 1]), Vector(p[i]), Vector(p[i + 1])
        d1, d2 = (a - b), (c - b)
        r = min(rad, d1.length / 2, d2.length / 2)
        s, e = b + d1.normalized() * r, b + d2.normalized() * r
        for k in range(7):
            t = k / 6
            q = (1 - t) ** 2 * s + 2 * (1 - t) * t * b + t ** 2 * e
            out.append(tuple(q))
    out.append(p[-1])
    return out

# ---------------- 모델 ----------------
CX = 0.5          # 로터 중심 x (±)
RG = 0.53         # 가드 링 반지름
DECK_Z = 0.34

root = bpy.data.objects.new("Trowel", None)
col.objects.link(root)

# 로터 (블레이드 + 스파이더) : 회전용 Empty 에 묶음
rotors = []
for sx in (-1, 1):
    e = bpy.data.objects.new(f"Rotor{sx}", None)
    col.objects.link(e)
    e.location = (sx * CX, 0, 0)
    e.parent = root
    cyl(0.085, 0.07, (0, 0, 0.07), M_DARK, parent=e)            # 허브
    cyl(0.04, 0.2, (0, 0, 0.19), M_STEEL, parent=e)             # 축
    for k in range(4):
        a = math.radians(90 * k)
        ca, sa = math.cos(a), math.sin(a)
        # 스파이더 암
        box((0.38, 0.035, 0.03), (ca * 0.22, sa * 0.22, 0.045), M_DARK, rot=(0, 0, a), parent=e, bevel=0.005)
        # 블레이드 (피치 약간)
        b = box((0.36, 0.15, 0.008), (ca * 0.28, sa * 0.28, 0.012), M_STEEL, rot=(math.radians(4), 0, a), parent=e, bevel=0.003)
    rotors.append(e)

# 기어박스
for sx in (-1, 1):
    cyl(0.13, 0.12, (sx * CX, 0, 0.26), M_DARK, parent=root)
    cyl(0.1, 0.05, (sx * CX, 0, 0.18), M_RED, parent=root)

# 데크 (체크판) : 원판 2개 + 가운데 판
for sx in (-1, 1):
    cyl(0.46, 0.025, (sx * CX, 0, DECK_Z), M_DECK, parent=root, verts=64)
box((1.0, 0.8, 0.02), (0, 0, DECK_Z + 0.006), M_DECK, parent=root, bevel=0.004)

# 가드 링 (8자 형태 바깥 둘레) 2단
def guard_loop(z):
    left = arc(-CX, 0, RG, 40, 320, z)
    right = arc(CX, 0, RG, -140, 140, z)
    # 오른쪽은 아래(앞)->위(뒤) 방향이므로 순서를 맞춰 폐곡선 구성
    pts = arc(CX, 0, RG, 140, -140 + 360, z) if False else None
    loop = left + list(reversed(arc(CX, 0, RG, -140, 140, z)))[::-1]
    return left, right

for z in (0.075, 0.2):
    left, right = guard_loop(z)
    tube(left, 0.016, M_YEL, parent=root)
    tube(right, 0.016, M_YEL, parent=root)
    # 앞뒤 연결부
    tube([left[0], right[-1]], 0.016, M_YEL, parent=root)
    tube([left[-1], right[0]], 0.016, M_YEL, parent=root)

# 가드 세로 기둥 + 데크로 올라가는 경사 지지대
for sx in (-1, 1):
    base = 180 if sx < 0 else 0
    for da in (-120, -80, -40, 0, 40, 80, 120):
        a = math.radians(base + da)
        x, y = sx * CX + RG * math.cos(a), RG * math.sin(a)
        tube([(x, y, 0.075), (x, y, 0.2)], 0.012, M_YEL, parent=root)
        xi, yi = sx * CX + 0.43 * math.cos(a), 0.43 * math.sin(a)
        if abs(da) <= 80:
            tube([(x, y, 0.2), (xi, yi, DECK_Z - 0.01)], 0.011, M_YEL, parent=root)

# 본체 섀시 (주황) + 엔진부 (빨강)
box((0.86, 0.5, 0.3), (0, 0.02, DECK_Z + 0.16), M_YEL, parent=root, bevel=0.02)
box((0.3, 0.012, 0.08), (0.12, -0.235, DECK_Z + 0.2), M_PLATE, parent=root, bevel=0.003)   # 명판(글자 없음)
box((0.2, 0.012, 0.06), (-0.18, -0.235, DECK_Z + 0.22), M_BLACK, parent=root, bevel=0.003)  # 스위치 패널
box((1.06, 0.36, 0.4), (0, 0.36, DECK_Z + 0.21), M_RED, parent=root, bevel=0.03)          # 엔진·연료탱크
box((0.5, 0.2, 0.12), (0.1, 0.36, DECK_Z + 0.47), M_DARK, parent=root, bevel=0.02)         # 에어클리너
cyl(0.05, 0.25, (0.45, 0.45, DECK_Z + 0.5), M_DARK, rot=(0, 0, 0), parent=root)            # 머플러
cyl(0.045, 0.03, (-0.35, 0.36, DECK_Z + 0.43), M_BLACK, parent=root)                       # 주유구

# 좌석
box((0.2, 0.2, 0.18), (0, 0.05, DECK_Z + 0.39), M_DARK, parent=root, bevel=0.01)
seat = box((0.5, 0.46, 0.1), (0, 0.02, DECK_Z + 0.53), M_BLACK, parent=root, bevel=0.035)
back = box((0.48, 0.1, 0.38), (0, 0.24, DECK_Z + 0.76), M_BLACK, rot=(math.radians(-10), 0, 0), parent=root, bevel=0.04)
for sx in (-1, 1):
    box((0.07, 0.3, 0.06), (sx * 0.29, 0.02, DECK_Z + 0.65), M_BLACK, parent=root, bevel=0.015)  # 팔걸이

# 좌석 주변 노란 롤 프레임
for sx in (-1, 1):
    tube(rounded([(sx * 0.36, -0.22, DECK_Z), (sx * 0.36, -0.22, DECK_Z + 0.62),
                  (sx * 0.32, 0.05, DECK_Z + 0.7), (sx * 0.32, 0.3, DECK_Z + 0.55)], 0.1), 0.017, M_YEL, parent=root)
tube([(-0.36, -0.22, DECK_Z + 0.3), (0.36, -0.22, DECK_Z + 0.3)], 0.017, M_YEL, parent=root)

# 앞쪽 범퍼 프레임 + 발판
for sx in (-1, 1):
    tube(rounded([(sx * 0.34, -0.2, DECK_Z), (sx * 0.34, -0.5, DECK_Z + 0.02),
                  (sx * 0.34, -0.5, DECK_Z + 0.3), (sx * 0.2, -0.5, DECK_Z + 0.3)]), 0.016, M_YEL, parent=root)
tube([(-0.2, -0.5, DECK_Z + 0.3), (0.2, -0.5, DECK_Z + 0.3)], 0.016, M_YEL, parent=root)
tube([(-0.34, -0.5, DECK_Z + 0.15), (0.34, -0.5, DECK_Z + 0.15)], 0.014, M_YEL, parent=root)
box((0.5, 0.2, 0.02), (0, -0.4, DECK_Z + 0.1), M_YEL, parent=root, bevel=0.005)
box((0.36, 0.015, 0.1), (0, -0.505, DECK_Z + 0.22), M_YEL, parent=root, bevel=0.004)

# 조종 레버 2개
for sx in (-1, 1):
    x = sx * 0.64
    box((0.08, 0.08, 0.1), (x, -0.05, DECK_Z + 0.05), M_YEL, parent=root, bevel=0.01)
    tube([(x, -0.05, DECK_Z + 0.1), (x, -0.05, DECK_Z + 0.66)], 0.016, M_YEL, parent=root)
    tube([(x, -0.05, DECK_Z + 0.66), (x + sx * 0.1, -0.05, DECK_Z + 0.69)], 0.014, M_DARK, parent=root)
    cyl(0.022, 0.1, (x + sx * 0.12, -0.05, DECK_Z + 0.7), M_BLACK, rot=(0, math.radians(90 - sx * 10), 0), parent=root)

# 작업등
for sx in (-1, 1):
    lx = sx * 0.9
    box((0.1, 0.08, 0.09), (lx, -0.28, DECK_Z + 0.08), M_BLACK, parent=root, bevel=0.012)
    box((0.07, 0.005, 0.06), (lx, -0.322, DECK_Z + 0.08), M_LENS, parent=root, bevel=0.002)
    tube([(lx, -0.26, DECK_Z + 0.03), (lx * 0.9, -0.2, DECK_Z)], 0.01, M_DARK, parent=root)

# ---------------- 조명 · 바닥 · 렌더 설정 ----------------
def light(kind, loc, energy, size=1.0, target=(0, 0, 0.4)):
    l = bpy.data.lights.new(kind, kind)
    l.energy = energy
    if kind == "AREA":
        l.size = size
    o = bpy.data.objects.new(kind, l)
    col.objects.link(o)
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return o

light("AREA", (-2.5, -3.0, 3.5), 900, 3.0)     # 키
light("AREA", (3.0, -1.5, 2.0), 350, 3.0)      # 필
light("AREA", (0.5, 3.5, 3.0), 600, 2.5)       # 림
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.03, 0.05, 0.045, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
ground = bpy.context.object
ground.is_shadow_catcher = True

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = int(os.environ.get("SAMPLES", 8))
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"
scene.view_settings.exposure = -0.6
scene.render.use_persistent_data = True
scene.cycles.max_bounces = 4
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 2
scene.cycles.transmission_bounces = 0
scene.cycles.transparent_max_bounces = 2
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.05

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
col.objects.link(cam)
scene.camera = cam

def aim(o, target):
    d = Vector(target) - o.location
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

def set_rotor(step_deg):
    # 두 로터를 서로 반대로 회전
    rotors[0].rotation_euler = (0, 0, math.radians(step_deg))
    rotors[1].rotation_euler = (0, 0, math.radians(-step_deg))

def turntable_cam(i, n=240, start=-35):
    ang = math.radians(start - 360 * i / n)   # 시계 방향으로 한 바퀴
    R, H = 4.3, 1.7
    cam.location = (R * math.sin(ang), -R * math.cos(ang), H)
    aim(cam, (0, 0.05, 0.5))

def res(w, h):
    r = os.environ.get("RES")
    return tuple(int(v) for v in r.split("x")) if r else (w, h)

# 라벨을 붙일 부품의 3D 기준점
PARTS = {
    "rotor": (CX + 0.3, -0.12, 0.03),
    "guard": (-CX - RG, 0, 0.2),
    "deck": (-CX - 0.2, -0.2, DECK_Z + 0.02),
    "engine": (-0.45, 0.36, DECK_Z + 0.3),
    "fuel": (-0.35, 0.36, DECK_Z + 0.45),
    "seat": (0, 0.1, DECK_Z + 0.75),
    "leverL": (-0.76, -0.05, DECK_Z + 0.7),
    "leverR": (0.76, -0.05, DECK_Z + 0.7),
    "light": (0.9, -0.32, DECK_Z + 0.08),
    "panel": (-0.18, -0.24, DECK_Z + 0.22),
    "gearbox": (CX, 0, 0.24),
    "footrest": (0, -0.45, DECK_Z + 0.12),
}

# 클로즈업 컷: 이름 -> (카메라 위치, 바라보는 점, 렌즈, 해상도)
SHOTS = {
    "levers": ((2.35, -2.05, 1.85), (0.3, 0, 0.7), 40, (1280, 820)),
    "engine": ((-2.3, 2.7, 1.75), (0, 0.25, 0.5), 48, (1280, 820)),
    "front": ((0, -4.2, 1.15), (0, 0, 0.5), 50, (1280, 820)),
    "top": ((0, 0, 5.0), None, 2.9, (1280, 820)),        # 정사영, 화면 위쪽 = 기계 앞쪽
    "rotor": ((2.15, -2.45, 0.5), (0.3, 0, 0.3), 34, (1280, 820)),
}

def set_shot(name):
    loc, target, lens, _ = SHOTS[name]
    cam.location = loc
    if target is None:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = lens
        cam.rotation_euler = (0, 0, math.pi)
        return
    cam_data.type = "PERSP"
    cam_data.lens = lens
    aim(cam, target)

def project_parts():
    bpy.context.view_layer.update()
    out = {}
    for k, p in PARTS.items():
        v = world_to_camera_view(scene, cam, Vector(p))
        out[k] = [round(v.x, 4), round(1 - v.y, 4), round(v.z, 3)]
    return out

if MODE == "still":
    scene.render.resolution_x, scene.render.resolution_y = 1200, 760
    cam_data.lens = 45
    turntable_cam(FRAME_ARG)
    set_rotor(20)
    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)

elif MODE == "turn":
    os.makedirs(OUT, exist_ok=True)
    scene.render.resolution_x, scene.render.resolution_y = res(1000, 640)
    cam_data.lens = 45
    start = FRAME_ARG
    end = int(sys.argv[4]) if len(sys.argv) > 4 else 240
    step = int(sys.argv[5]) if len(sys.argv) > 5 else 1
    for i in range(start, end, step):
        turntable_cam(i)
        set_rotor(i * 6)          # 프레임당 6도 회전
        scene.render.filepath = os.path.join(OUT, f"t{i:03d}.png")
        bpy.ops.render.render(write_still=True)

elif MODE == "bottom":
    os.makedirs(OUT, exist_ok=True)
    ground.hide_render = True
    scene.render.resolution_x, scene.render.resolution_y = 1000, 560
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.4
    cam.location = (0, 0, -2.0)
    cam.rotation_euler = (math.pi, 0, 0)   # 아래에서 위를 봄 (화면 위쪽 = 기계 앞쪽)
    light("AREA", (-0.8, -0.6, -1.6), 160, 3.0, target=(0, 0, 0.3))
    for i in range(30):                      # 3도 간격 30장 = 90도 (블레이드 4매라 이어서 반복 가능)
        # 아래에서 보면 회전이 거울상이므로 부호 반대 → 화면상 왼쪽 반시계 · 오른쪽 시계
        rotors[0].rotation_euler = (0, 0, math.radians(-3 * i))
        rotors[1].rotation_euler = (0, 0, math.radians(3 * i))
        scene.render.filepath = os.path.join(OUT, f"b{i:03d}.png")
        bpy.ops.render.render(write_still=True)

elif MODE == "shots":
    os.makedirs(OUT, exist_ok=True)
    set_rotor(20)
    only = os.environ.get("ONLY")               # 예: ONLY=rotor,top
    for name, (_, _, _, wh) in SHOTS.items():
        if only and name not in only.split(","):
            continue
        scene.render.resolution_x, scene.render.resolution_y = res(*wh)
        set_shot(name)
        if name == "rotor":                  # 블레이드 4매 → 6도 x 15장 = 90도 루프
            for i in range(15):
                set_rotor(i * 6)
                scene.render.filepath = os.path.join(OUT, f"rotor_{i:03d}.png")
                bpy.ops.render.render(write_still=True)
            set_rotor(20)
        else:
            scene.render.filepath = os.path.join(OUT, f"{name}.png")
            bpy.ops.render.render(write_still=True)

elif MODE == "anchors":
    data = {"turn": [], "shots": {}}
    scene.render.resolution_x, scene.render.resolution_y = res(1000, 640)
    cam_data.lens = 45
    for i in range(240):
        turntable_cam(i)
        data["turn"].append(project_parts())
    for name, (_, _, _, wh) in SHOTS.items():
        scene.render.resolution_x, scene.render.resolution_y = res(*wh)
        set_shot(name)
        data["shots"][name] = project_parts()
    with open(OUT, "w") as f:
        json.dump(data, f)
