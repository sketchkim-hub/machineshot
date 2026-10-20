"""목재 파쇄기(우드칩 제조기) 3D 모델 · 렌더 (Blender bpy / Cycles)

사용법:
  python3 woodchip3d.py still   out.png      # 확인용
  python3 woodchip3d.py hero    out_dir/     # 정면 왕복 궤도 120프레임 (끊김 없는 루프)
  python3 woodchip3d.py rotor   out_dir/     # 로터 · 스크린 · 배출부 클로즈업 60프레임 (루프)
  python3 woodchip3d.py feed    out_dir/     # 투입대 · 호퍼 쪽 사선 컷 60프레임 (루프)
  python3 woodchip3d.py anchors out.json     # 컷별 라벨 2D 좌표

환경변수 RES=가로x세로, SAMPLES=n, FRAMES=시작:끝
"""
import bpy, math, sys, os, json, random
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

MODE = sys.argv[1] if len(sys.argv) > 1 else "still"
OUT = sys.argv[2] if len(sys.argv) > 2 else "still.png"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

def hexrgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1]

def mat(name, hexc, metal=0.0, rough=0.5, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexc)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = hexrgb(hexc)
        b.inputs["Emission Strength"].default_value = emit
    return m

M_YEL = mat("yellow", "#F5BC00", 0.1, 0.42)
M_YEL2 = mat("yellow2", "#D99A00", 0.1, 0.48)
M_BLUE = mat("motor", "#2559B0", 0.3, 0.35)
M_DARK = mat("dark", "#33383D", 0.4, 0.5)
M_LINER = mat("liner", "#1E2226", 0.5, 0.6)
M_STEEL = mat("steel", "#B9C0C6", 0.9, 0.3)
M_BLADE = mat("blade", "#EEF2F5", 0.95, 0.12)
M_SCREEN = mat("screen", "#8A939B", 0.85, 0.4)
M_WOOD = mat("wood", "#C79A5E", 0.0, 0.7)
M_BARK = mat("bark", "#5E3F22", 0.0, 0.85)
M_CHIP = mat("chip", "#D6A866", 0.0, 0.75)
M_DUST = mat("dust", "#E9CFA0", 0.0, 0.95)
M_RED = mat("red", "#C93A2E", 0.1, 0.4)
M_WARN = mat("warn", "#151515", 0.1, 0.5)

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

def box(size, loc, m, rot=(0, 0, 0), parent=None, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, parent, bevel, smooth=False)

def cyl(r, depth, loc, m, rot=(0, 0, 0), parent=None, verts=32, fill="NGON"):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts, end_fill_type=fill)
    return finish(bpy.context.object, m, parent)

def cone(r1, r2, depth, loc, m, parent=None, verts=32):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, vertices=verts)
    return finish(bpy.context.object, m, parent)

def empty(name, loc, rot=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    col.objects.link(e)
    e.location = loc
    e.rotation_euler = rot
    if parent:
        e.parent = parent
    return e

RY = (math.radians(90), 0, 0)      # Y축 방향 원통
RX = (0, math.radians(90), 0)      # X축 방향 원통

# ---------------- 치수 (m) ----------------
HC = Vector((0, 0, 0.95))          # 하우징 중심 (로터 축)
HR = 0.62                          # 하우징 반지름
P = 30                             # 1 사이클 = 30프레임
OUTLET = Vector((0, -0.62, 0.13))   # 배출구 끝
PILE = Vector((0, -1.25, 0.0))     # 칩 더미

rotor = None
logs, chips_out, chips_in = [], [], []

def log_obj(r, L, m_end=M_WOOD):
    """X축 방향 통나무 (껍질 + 나이테 단면). 원점 = 앞쪽 끝"""
    root = empty("log", (0, 0, 0))
    cyl(r, L, (-L / 2, 0, 0), M_BARK, rot=RX, parent=root, verts=14)
    cyl(r * 0.88, 0.006, (0.001, 0, 0), m_end, rot=RX, parent=root, verts=14)
    cyl(r * 0.88, 0.006, (-L - 0.001, 0, 0), m_end, rot=RX, parent=root, verts=14)
    return root

def build():
    global rotor
    rnd = random.Random(7)
    # ── 베이스 프레임 (채널) ──
    for y in (-0.42, 0.42):
        box((2.6, 0.1, 0.16), (0.05, y, 0.08), M_DARK)
    for x in (-1.1, -0.3, 0.6, 1.25):
        box((0.1, 0.84, 0.1), (x, 0, 0.11), M_DARK)
    # ── 하우징 받침 + 배출 슈트 ──
    box((1.05, 0.4, 0.24), (0, 0.08, 0.26), M_YEL, bevel=0.01)
    box((0.46, 0.4, 0.2), (0, -0.4, 0.2), M_YEL2, rot=(math.radians(-22), 0, 0), bevel=0.01)
    box((0.42, 0.05, 0.05), (0, -0.6, 0.1), M_DARK)                                  # 배출구 테
    # ── 원형 하우징 (앞쪽 커버 개방: 내부 투시) ──
    shell = cyl(HR, 0.5, HC, M_YEL, rot=RY, verts=64, fill="NOTHING")
    sol = shell.modifiers.new("sol", "SOLIDIFY")
    sol.thickness = 0.025
    cyl(HR, 0.03, HC + Vector((0, 0.24, 0)), M_YEL, rot=RY, verts=64)                   # 뒤판
    cyl(HR - 0.02, 0.01, HC + Vector((0, 0.22, 0)), M_LINER, rot=RY, verts=64)          # 내부 라이너
    bpy.ops.mesh.primitive_torus_add(major_radius=HR - 0.01, minor_radius=0.035, location=HC + Vector((0, -0.25, 0)), rotation=RY, major_segments=64, minor_segments=10)
    finish(bpy.context.object, M_YEL2)                                                   # 앞 테두리
    for k in range(12):                                                                  # 볼트
        a = 2 * math.pi * k / 12
        cyl(0.018, 0.03, HC + Vector((math.cos(a) * (HR + 0.03), -0.26, math.sin(a) * (HR + 0.03))), M_DARK, rot=RY, verts=8)
    # ── 로터: 원판 + 칼날 3장 + 해머 6개 ──
    rotor = empty("rotor", HC + Vector((0, 0.05, 0)))
    cyl(0.47, 0.05, (0, 0, 0), M_STEEL, rot=RY, parent=rotor, verts=48)
    cyl(0.1, 0.12, (0, -0.05, 0), M_DARK, rot=RY, parent=rotor, verts=24)                 # 허브
    for k in range(3):
        a = 2 * math.pi * k / 3
        piv = empty("arm", (0, 0, 0), rot=(0, -a, 0), parent=rotor)
        box((0.3, 0.03, 0.055), (0.27, -0.04, 0.03), M_BLADE, parent=piv, bevel=0.002)  # 칼날
        box((0.3, 0.02, 0.02), (0.27, -0.04, -0.005), M_DARK, parent=piv)                # 칼날 홀더
        for s in (1, -1):
            piv2 = empty("ham", (0, 0, 0), rot=(0, -(a + s * math.radians(55)), 0), parent=rotor)
            cyl(0.02, 0.1, (0.4, -0.04, 0), M_DARK, rot=RY, parent=piv2, verts=10)        # 해머 핀
            box((0.13, 0.05, 0.05), (0.45, -0.07, 0), M_STEEL, parent=piv2, bevel=0.006)  # 해머
    # ── 스크린 (아래쪽 원호, 구멍 = 틈) ──
    for k in range(13):
        a = math.radians(205 + k * 10.8)
        r = HR - 0.06
        box((0.045, 0.42, 0.012), HC + Vector((math.cos(a) * r, -0.02, math.sin(a) * r)), M_SCREEN, rot=(0, -a + math.pi / 2, 0), bevel=0.0)
    # ── 고정 칼날 (모루) : 옆 투입구 앞 ──
    box((0.06, 0.4, 0.04), HC + Vector((-HR + 0.08, -0.02, -0.07)), M_BLADE, bevel=0.002)
    # ── 옆 투입대 (왼쪽) ──
    box((0.3, 0.44, 0.03), (-0.75, -0.02, 0.86), M_YEL2)                               # 투입구 목 바닥
    box((0.3, 0.44, 0.03), (-0.75, -0.02, 1.12), M_YEL2)                               # 윗판
    for y in (-0.235, 0.195):
        box((0.3, 0.02, 0.29), (-0.75, y, 0.99), M_YEL2)
    box((1.0, 0.5, 0.03), (-1.4, -0.02, 0.86), M_YEL, bevel=0.006)                     # 테이블
    for y in (-0.26, 0.22):
        box((1.0, 0.02, 0.12), (-1.4, y, 0.92), M_YEL)
    for x in (-1.82, -1.0):
        for y in (-0.22, 0.18):
            box((0.05, 0.05, 0.82), (x, y, 0.43), M_DARK)
    # ── 상부 경사 호퍼 (오른쪽 위로 45°) ──
    hp = empty("hopper", HC + Vector((0.2, -0.02, 0.5)), rot=(0, math.radians(42), 0))
    L = 0.85
    for s in (-1, 1):
        box((0.36, 0.015, L), (0, s * 0.22, L / 2), M_YEL, parent=hp)
        box((0.015, 0.45, L), (s * 0.18, 0, L / 2), M_YEL, parent=hp)
        box((0.5, 0.02, 0.06), (0, s * 0.3, L + 0.05), M_YEL2, rot=(s * math.radians(20), 0, 0), parent=hp)   # 나팔 입구
        box((0.02, 0.6, 0.06), (s * 0.24, 0, L + 0.05), M_YEL2, rot=(0, -s * math.radians(20), 0), parent=hp)
    # 호퍼 안의 나뭇가지
    for k, (dy, dx) in enumerate(((-0.08, -0.05), (0.07, 0.04), (0.0, 0.08))):
        br = empty("branch", (dx, dy, L * 0.55 + k * 0.08), rot=(0, math.radians(-90), 0), parent=hp)
        cyl(0.025 - k * 0.004, 0.55, (-0.27, 0, 0), M_BARK, rot=RX, parent=br, verts=8)
    # ── 전동기 (파란색, 오른쪽) ──
    box((0.55, 0.6, 0.2), (1.08, 0.0, 0.26), M_DARK)                                    # 모터 받침
    cyl(0.25, 0.62, (1.08, 0.0, 0.62), M_BLUE, rot=RY, verts=40)
    for k in range(9):                                                                   # 냉각 핀
        cyl(0.265, 0.018, (1.08, -0.24 + k * 0.06, 0.62), M_BLUE, rot=RY, verts=40)
    cyl(0.2, 0.06, (1.08, -0.33, 0.62), M_DARK, rot=RY, verts=32)                       # 팬 커버
    box((0.2, 0.16, 0.12), (1.08, 0.05, 0.92), M_BLUE, bevel=0.01)                       # 단자함
    # ── 벨트 가드 (뒤쪽, 로터 축 ↔ 모터) ──
    a0, a1 = Vector((0, 0.36, HC.z)), Vector((1.08, 0.36, 0.62))
    d = a1 - a0
    box((d.length, 0.12, 0.32), (a0 + a1) / 2, M_YEL2, rot=(0, -math.atan2(d.z, d.x), 0))
    cyl(0.2, 0.12, a0, M_YEL2, rot=RY, verts=32)
    cyl(0.16, 0.12, a1, M_YEL2, rot=RY, verts=32)
    # 비상 정지 · 스위치함
    box((0.24, 0.12, 0.32), (0.75, -0.3, 1.12), M_DARK, bevel=0.01)
    cyl(0.045, 0.04, (0.75, -0.37, 1.18), M_RED, rot=RY, verts=20)
    box((0.03, 0.4, 0.03), (0.75, -0.18, 0.95), M_DARK)
    # ── 칩 더미 + 톱밥 더미 ──
    cone(0.5, 0.0, 0.22, PILE + Vector((0, 0, 0.11)), M_CHIP, verts=40)
    for k in range(70):
        a = rnd.uniform(0, 2 * math.pi)
        rr = math.sqrt(rnd.random()) * 0.48
        z = 0.22 * (1 - rr / 0.5) + 0.005
        box((0.05, 0.03, 0.008), PILE + Vector((math.cos(a) * rr, math.sin(a) * rr, z)), M_CHIP if k % 3 else M_WOOD,
            rot=(rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), rnd.uniform(0, 3.1)), bevel=0.0)
    cone(0.38, 0.0, 0.16, (-1.15, -1.15, 0.08), M_DUST, verts=40)
    # ── 옆 투입대 위 통나무 (움직임) ──
    for k in range(2):
        logs.append((log_obj(0.06 - k * 0.012, 0.9), k))
    for k in range(2):                                                                   # 대기 중인 통나무
        lg = log_obj(0.05, 0.75)
        lg.location = (-1.0, 0.12 - k * 0.0, 0.93 + k * 0.1)
        lg.rotation_euler = (0, 0, math.radians(4))
    # ── 날리는 칩 (배출구 → 더미) ──
    for k in range(40):
        bpy.ops.mesh.primitive_cube_add(size=1)
        c = bpy.context.object
        c.scale = (0.035, 0.022, 0.007)
        bpy.ops.object.transform_apply(scale=True)
        finish(c, M_CHIP if k % 4 else M_WOOD, smooth=False)
        chips_out.append((c, rnd.random(), rnd.uniform(-0.18, 0.18), rnd.uniform(0.8, 1.2), rnd.choice((1, 2, 3)), rnd.random() * 6.28))
    # ── 하우징 안에서 도는 칩 ──
    for k in range(26):
        bpy.ops.mesh.primitive_cube_add(size=1)
        c = bpy.context.object
        c.scale = (0.04, 0.02, 0.008)
        bpy.ops.object.transform_apply(scale=True)
        finish(c, M_CHIP, smooth=False)
        chips_in.append((c, rnd.uniform(0, 2 * math.pi), rnd.uniform(0.3, 0.55), rnd.uniform(-0.16, 0.0), rnd.random() * 6.28))

def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

ROT_STEP = 2 * math.pi / 3 / 10   # 10프레임에 1/3 회전 (3중 대칭 → 30프레임 루프)

def set_frame(t):
    ang = t * ROT_STEP
    rotor.rotation_euler = (0, -ang, 0)
    # 통나무: 60프레임 주기로 테이블을 따라 들어가며, 앞쪽 끝은 고정 칼날에서 깎여 짧아짐
    for lg, k in logs:
        ph = ((t + k * 30) % 60) / 60
        L0 = 0.9
        back = -1.85 + 1.25 * ph                     # 뒤쪽 끝 위치
        front = min(-0.58, back + L0)
        Lnow = front - back
        if Lnow < 0.02:
            lg.hide_render = True
            for ch in lg.children:
                ch.hide_render = True
            continue
        for ch in lg.children:
            ch.hide_render = False
        lg.location = (front, -0.03 + 0.02 * k, 0.935 - k * 0.012)
        lg.scale = (Lnow / L0, 1, 1)
        lg.rotation_euler = (0, 0, 0)
    # 배출 칩: 배출구에서 앞 · 아래로 포물선
    for c, ph0, side, sp, spin, r0 in chips_out:
        age = ((t / P) + ph0) % 1.0
        v = Vector((side * 0.6, -0.75 * sp, -0.1))
        p = OUTLET + Vector((side * 0.3, 0, 0)) * 0.3 + v * age + Vector((0, 0, -0.25 * age * age))
        c.location = p
        c.rotation_euler = (r0 + spin * 2 * math.pi * age, r0 * 0.7 + spin * 2 * math.pi * age, r0)
        c.hide_render = p.z < 0.06
    # 내부 칩: 로터와 같은 방향으로 회전 (30프레임에 한 바퀴 → 루프)
    for c, a0, r, dy, r0 in chips_in:
        a = a0 - 2 * math.pi * (t % P) / P
        c.location = HC + Vector((math.cos(a) * r, dy, math.sin(a) * r))
        c.rotation_euler = (r0, a * 2, r0)

# ---------------- 조명 · 카메라 ----------------
def light(kind, loc, energy, size=1.0, target=(0, 0, 0.9)):
    l = bpy.data.lights.new(kind, kind)
    l.energy = energy
    if kind == "AREA":
        l.size = size
    o = bpy.data.objects.new(kind, l)
    col.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.035, 0.06, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.4

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
col.objects.link(cam)
scene.camera = cam

def aim(target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()

def hero_cam(i, n=120):
    """정면 기준 -32° ~ +40° 를 왕복 (cos 곡선 → 120프레임 끊김 없는 루프)"""
    a = math.radians(-32 + 36 * (1 - math.cos(2 * math.pi * i / n)))
    R, H = 5.6, 2.1
    cam.location = (-0.1 + R * math.sin(a), -0.2 - R * math.cos(a), H)
    cam_data.lens = 34
    aim((-0.15, -0.25, 0.8))

def rotor_cam():
    cam.location = (0.25, -2.3, 1.1)
    cam_data.lens = 38
    aim((-0.1, 0, 0.78))

def feed_cam():
    cam.location = (-2.6, -2.4, 2.3)
    cam_data.lens = 36
    aim((-0.55, 0, 1.0))

PTS = {
    "hopper": (0.62, -0.02, 1.95),
    "table": (-1.45, -0.27, 0.9),
    "housing": (-0.45, -0.25, 1.4),
    "rotor": (0.0, -0.05, 0.95),
    "knife": (0.18, -0.05, 1.15),
    "hammer": (-0.33, -0.08, 0.68),
    "anvil": (-0.54, -0.22, 0.88),
    "screen": (0.22, -0.22, 0.45),
    "outlet": (0.0, -0.62, 0.13),
    "pile": (0.0, -1.25, 0.15),
    "dust": (-1.15, -1.15, 0.12),
    "motor": (1.08, -0.3, 0.75),
    "belt": (0.6, 0.36, 1.0),
    "estop": (0.75, -0.38, 1.18),
    "log": (-1.2, -0.03, 0.97),
}

def setup_render(w=1280, h=720):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = int(os.environ.get("SAMPLES", 10))
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.05
    scene.cycles.max_bounces = 4
    scene.cycles.glossy_bounces = 2
    scene.cycles.diffuse_bounces = 2
    scene.cycles.transmission_bounces = 0
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.2
    scene.render.use_persistent_data = True
    r = os.environ.get("RES")
    scene.render.resolution_x, scene.render.resolution_y = (tuple(int(v) for v in r.split("x")) if r else (w, h))

def frames_range(n):
    r = os.environ.get("FRAMES")
    if r:
        a, b = (int(v) for v in r.split(":"))
        return range(a, min(b, n))
    return range(n)

def render_to(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def project():
    bpy.context.view_layer.update()
    out = {}
    for k, p in PTS.items():
        v = world_to_camera_view(scene, cam, Vector(p))
        out[k] = [round(v.x, 4), round(1 - v.y, 4)]
    return out

if MODE == "anchors":
    setup_render()
    data = {"hero": []}
    for i in range(120):
        hero_cam(i)
        data["hero"].append(project())
    rotor_cam()
    data["rotor"] = project()
    feed_cam()
    data["feed"] = project()
    with open(OUT, "w") as f:
        json.dump(data, f)
    sys.exit(0)

build()
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
bpy.context.object.is_shadow_catcher = True
light("SUN", (4, -6, 8), 3.0, target=(0, 0, 0))
light("AREA", (-3, -4, 3.5), 900, 4.0)
light("AREA", (3.5, -2.5, 3.0), 700, 4.0)
light("AREA", (0.5, 3, 4), 600, 4.0)
light("POINT", (0.1, -0.9, 1.0), 60)            # 하우징 내부를 밝히는 보조광
setup_render()

if MODE == "still":
    which = os.environ.get("CAM", "hero")
    {"hero": lambda: hero_cam(int(os.environ.get("I", 0))), "rotor": rotor_cam, "feed": feed_cam}[which]()
    set_frame(12)
    render_to(OUT)
elif MODE == "hero":
    os.makedirs(OUT, exist_ok=True)
    for i in frames_range(120):
        hero_cam(i)
        set_frame(i)
        render_to(os.path.join(OUT, f"h{i:03d}.png"))
elif MODE == "rotor":
    os.makedirs(OUT, exist_ok=True)
    rotor_cam()
    for i in frames_range(60):
        set_frame(i)
        render_to(os.path.join(OUT, f"r{i:03d}.png"))
elif MODE == "feed":
    os.makedirs(OUT, exist_ok=True)
    feed_cam()
    for i in frames_range(60):
        set_frame(i)
        render_to(os.path.join(OUT, f"f{i:03d}.png"))
