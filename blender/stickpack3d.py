"""다열(6열) 스틱 포장기 3D 모델 · 렌더 (Blender bpy / Cycles)

사용법:
  python3 stickpack3d.py still   out.png      # 확인용 (영웅 컷 0번 프레임)
  python3 stickpack3d.py hero    out_dir/     # 정면 120° 궤도 120프레임 (실링 조 4사이클)
  python3 stickpack3d.py seal    out_dir/     # 성형 · 실링 · 커팅부 클로즈업 60프레임 (2사이클 루프)
  python3 stickpack3d.py top     out_dir/     # 호퍼 · 계량 · 필름 슬리터 클로즈업 60프레임 (루프)
  python3 stickpack3d.py anchors out.json     # 컷별 라벨 2D 좌표

환경변수 RES=가로x세로, SAMPLES=n, FRAMES=시작:끝
"""
import bpy, math, sys, os, json
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

def mat(name, hexc, metal=0.0, rough=0.5, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexc)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = hexrgb(hexc)
        b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m

M_SS = mat("stainless", "#D0D6DA", 0.92, 0.24)
M_SS2 = mat("brushed", "#BCC3C8", 0.85, 0.36)
M_DARK = mat("dark", "#2D3135", 0.3, 0.5)
M_BLUE = mat("belt", "#2C63C9", 0.0, 0.45)
M_FILM = mat("film", "#E7C35A", 0.6, 0.25)          # 금색 알루미늄 필름
M_STICK = mat("stick", "#D9A93C", 0.5, 0.3)
M_HEAT = mat("heater", "#D2523C", 0.2, 0.4, emit=0.4)
M_SCREEN = mat("screen", "#2E86C9", 0.0, 0.2, emit=0.8)
M_WHITE = mat("white", "#EEF1F3", 0.1, 0.4)
M_RED = mat("red", "#C93A2E", 0.1, 0.4)
M_GREEN = mat("green", "#3DA45B", 0.1, 0.4)
M_BLADE = mat("blade", "#E9EEF1", 0.95, 0.15)
M_ACRYL = mat("acrylic", "#CFE6F5", 0.0, 0.1, alpha=0.25)

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

def cyl(r, depth, loc, m, rot=(0, 0, 0), parent=None, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    return finish(bpy.context.object, m, parent)

def cone(r1, r2, depth, loc, m, parent=None, verts=24):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, vertices=verts)
    return finish(bpy.context.object, m, parent)

def bar(a, b, r, m, parent=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(r, d.length, (a + b) / 2, m, parent=parent, verts=12)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o

# ---------------- 치수 (m) ----------------
LANES = [-0.25 + 0.1 * i for i in range(6)]
JAW_Z = 1.30
P = 30                     # 1 사이클 = 30프레임 (실링 → 커팅 → 낙하)
CONV_A = Vector((0.0, -0.42, 0.98))      # 배출 컨베이어 시작
CONV_B = Vector((0.95, -1.35, 0.62))     # 끝

jaws, vseal, sticks, roll_spokes = [], [], [], []

def build():
    # 하부 캐비닛
    box((1.25, 0.9, 1.0), (0, 0, 0.55), M_SS2, bevel=0.01)
    for x in (-0.31, 0.31):
        box((0.6, 0.012, 0.85), (x, -0.456, 0.55), M_SS, bevel=0.004)          # 문
        box((0.02, 0.03, 0.18), (x + (0.24 if x < 0 else -0.24), -0.47, 0.6), M_DARK)  # 손잡이
    for x, y in ((-0.58, -0.4), (0.58, -0.4), (-0.58, 0.4), (0.58, 0.4)):
        cyl(0.045, 0.05, (x, y, 0.025), M_DARK, verts=16)
    # 상부 프레임
    for x in (-0.6, 0.6):
        for y in (-0.42, 0.42):
            box((0.05, 0.05, 1.45), (x, y, 1.78), M_SS)
    for z in (1.08, 2.5):
        for y in (-0.42, 0.42):
            box((1.25, 0.05, 0.05), (0, y, z), M_SS)
        for x in (-0.6, 0.6):
            box((0.05, 0.89, 0.05), (x, 0, z), M_SS)
    box((0.02, 0.85, 1.4), (-0.6, 0, 1.78), M_SS2, bevel=0.0)              # 왼쪽 측판
    box((1.2, 0.02, 1.4), (0, 0.42, 1.78), M_SS2, bevel=0.0)               # 뒤판
    # 상부 호퍼 + 교반 모터
    box((0.95, 0.42, 0.32), (0, 0.02, 2.72), M_SS, bevel=0.015)
    box((0.97, 0.44, 0.02), (0, 0.02, 2.89), M_SS2)
    cyl(0.07, 0.18, (0.3, 0.02, 3.0), M_DARK, verts=20)
    # 계량부: 열마다 펌프 블록 + 투입관
    for x in LANES:
        box((0.06, 0.07, 0.1), (x, -0.02, 2.48), M_SS2, bevel=0.006)
        cyl(0.011, 0.6, (x, -0.02, 2.13), M_SS, verts=16)
        cyl(0.004, 0.25, (x + 0.02, -0.07, 2.36), M_DARK, rot=(0.3, 0, 0), verts=8)     # 공압 호스
    # 필름 롤 (뒤쪽) + 스포크 (회전 표시)
    roll = bpy.data.objects.new("roll", None)
    col.objects.link(roll)
    roll.location = (0, 0.62, 1.55)
    cyl(0.24, 0.66, (0, 0, 0), M_FILM, rot=(0, math.radians(90), 0), parent=roll, verts=48)
    cyl(0.06, 0.7, (0, 0, 0), M_SS, rot=(0, math.radians(90), 0), parent=roll, verts=20)
    for k in range(3):
        a = math.pi * k / 3
        box((0.02, 0.4, 0.04), (0.34, 0, 0), M_DARK, rot=(a, 0, 0), parent=roll)
        box((0.02, 0.4, 0.04), (-0.34, 0, 0), M_DARK, rot=(a, 0, 0), parent=roll)
    roll_spokes.append(roll)
    box((0.05, 0.05, 0.6), (-0.4, 0.62, 1.25), M_SS)
    box((0.05, 0.05, 0.6), (0.4, 0.62, 1.25), M_SS)
    # 필름 경로: 롤 → 상부 롤러 → 슬리터
    cyl(0.03, 0.72, (0, 0.2, 2.02), M_SS, rot=(0, math.radians(90), 0), verts=20)
    p0, p1 = Vector((0, 0.6, 1.79)), Vector((0, 0.2, 2.05))
    d = p1 - p0
    box((0.64, d.length, 0.002), (p0 + p1) / 2, M_FILM, rot=(math.atan2(d.z, -d.y) * -1 + 0, 0, 0), bevel=0.0)
    for x in LANES[:-1]:
        cyl(0.035, 0.004, (x + 0.05, 0.2, 2.02), M_BLADE, rot=(0, math.radians(90), 0), verts=32)   # 슬리터 칼날
    # 성형 숄더 + 성형 튜브 + 감싼 필름
    for x in LANES:
        cone(0.04, 0.018, 0.07, (x, 0.0, 1.9), M_SS)
        cyl(0.017, 0.5, (x, 0.0, 1.62), M_FILM, verts=20)
        box((0.044, 0.004, 0.08), (x, 0.03, 1.95), M_FILM, rot=(0.6, 0, 0), bevel=0.0)
    # 세로 실링 바 (열마다)
    for x in LANES:
        o = box((0.03, 0.04, 0.3), (x, -0.045, 1.62), M_HEAT, bevel=0.004)
        vseal.append(o)
    box((0.65, 0.04, 0.04), (0, -0.09, 1.79), M_SS)                       # 세로 실링 지지대
    # 가로 실링 조 (앞 · 뒤)
    for sy in (-1, 1):
        j = box((0.68, 0.035, 0.06), (0, sy * 0.06, JAW_Z), M_HEAT, bevel=0.005)
        jaws.append((j, sy))
    # 커터
    box((0.68, 0.01, 0.012), (0, -0.03, JAW_Z - 0.07), M_BLADE, bevel=0.0)
    box((0.7, 0.05, 0.03), (0, -0.07, JAW_Z - 0.07), M_DARK)
    # 매달린 스틱 (튜브 아래로 이어지는 필름)
    for x in LANES:
        cyl(0.016, 0.1, (x, 0, JAW_Z + 0.06), M_STICK, verts=16)
    # 배출 컨베이어 (경사)
    d = CONV_B - CONV_A
    mid = (CONV_A + CONV_B) / 2
    yaw = math.atan2(d.y, d.x)
    pitch = math.atan2(d.z, math.hypot(d.x, d.y))
    L = d.length
    belt = box((L, 0.36, 0.03), mid, M_BLUE, rot=(0, -pitch, yaw), bevel=0.01)
    for s in (-1, 1):
        box((L, 0.02, 0.07), mid + Vector((-math.sin(yaw), math.cos(yaw), 0)) * 0.19 * s, M_SS, rot=(0, -pitch, yaw))
    cyl(0.05, 0.38, CONV_B + Vector((0.02, -0.02, 0)), M_BLUE, rot=(math.radians(90), 0, yaw + math.radians(90)), verts=24)
    for t in (0.35, 0.95):
        p = CONV_A + d * t
        box((0.04, 0.04, p.z), (p.x, p.y, p.z / 2), M_SS)
    # HMI 터치스크린 암 (오른쪽)
    box((0.05, 0.05, 0.5), (0.78, 0.3, 2.25), M_WHITE)
    box((0.38, 0.05, 0.05), (0.78, 0.1, 2.48), M_WHITE, rot=(0, 0, math.radians(90)))
    box((0.36, 0.05, 0.27), (0.92, -0.22, 1.85), M_WHITE, bevel=0.01)
    box((0.3, 0.005, 0.2), (0.92, -0.25, 1.86), M_SCREEN, bevel=0.0)
    bar((0.92, -0.1, 2.0), (0.78, 0.1, 2.46), 0.022, M_WHITE)
    # 오른쪽 조작반 + 비상 정지
    box((0.02, 0.6, 0.6), (0.63, -0.05, 0.62), M_SS)
    for i in range(3):
        for j in range(2):
            box((0.01, 0.05, 0.035), (0.645, -0.25 + i * 0.12, 0.75 - j * 0.08), M_DARK)
    cyl(0.04, 0.03, (0.65, 0.15, 0.5), M_RED, rot=(0, math.radians(90), 0), verts=20)
    # 스틱 (낙하 · 컨베이어 위)
    for x in LANES:
        for k in range(8):
            bpy.ops.mesh.primitive_cube_add(size=1)
            s = bpy.context.object
            s.scale = (0.03, 0.01, 0.14)
            bpy.ops.object.transform_apply(scale=True)
            finish(s, M_STICK, bevel=0.003, smooth=False)
            sticks.append((s, x, k))

def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def set_frame(t):
    ph = (t % P) / P
    # 가로 실링 조: 0.25~0.35 닫힘 → 0.6 까지 유지 → 0.7 열림
    close = smooth((ph - 0.2) / 0.12) * (1 - smooth((ph - 0.6) / 0.12))
    for j, sy in jaws:
        j.location.y = sy * (0.06 - 0.038 * close)
    for o in vseal:
        o.location.y = -0.045 + 0.02 * close
    # 스틱: 0.55 에 커팅 → 낙하(0.55~0.75) → 컨베이어 이동
    d = CONV_B - CONV_A
    yaw = math.atan2(d.y, d.x)
    pitch = math.atan2(d.z, math.hypot(d.x, d.y))
    for s, x, k in sticks:
        age = (t % P) / P - 0.55 + k        # 컷 이후 지난 사이클 수
        if age < 0:
            s.hide_render = True
            continue
        s.hide_render = False
        if age < 0.25:
            f = age / 0.25
            s.location = (x, -0.12 - 0.15 * f, JAW_Z - 0.15 - 0.2 * f * f)
            s.rotation_euler = (math.radians(-60 * f), 0, 0)
        else:
            u = min(1.0, (age - 0.25) / 6.5)
            p = CONV_A + d * (0.12 + 0.85 * u)
            side = Vector((-math.sin(yaw), math.cos(yaw), 0)) * (x * 0.55)
            s.location = p + side + Vector((0, 0, 0.03))
            s.rotation_euler = (math.radians(90), -pitch, yaw + math.radians(90))
            s.hide_render = u >= 1.0
    for r in roll_spokes:
        r.rotation_euler = (-(t % (P * 2)) / (P * 2) * math.pi / 3, 0, 0)   # 2사이클에 60° → 스포크 대칭으로 루프

# ---------------- 조명 · 카메라 ----------------
def light(kind, loc, energy, size=1.0, target=(0, 0, 1.4)):
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
    a = math.radians(-30 + 80 * i / (n - 1))
    R, H = 5.6, 2.2
    cam.location = (0.15 + R * math.sin(a), -0.3 - R * math.cos(a), H)
    cam_data.lens = 36
    aim((0.2, -0.3, 1.5))

def seal_cam():
    cam.location = (0.55, -1.35, 1.55)
    cam_data.lens = 40
    aim((0.05, -0.1, 1.33))

def top_cam():
    cam.location = (0.55, -1.45, 2.95)
    cam_data.lens = 36
    aim((0.0, 0.1, 2.1))

PTS = {
    "hopper": (0.0, -0.19, 2.75),
    "dosing": (0.15, -0.06, 2.45),
    "roll": (0.33, 0.45, 1.6),
    "slitter": (0.1, 0.2, 2.05),
    "forming": (0.15, -0.02, 1.85),
    "vseal": (0.05, -0.07, 1.62),
    "jaws": (0.2, -0.08, 1.3),
    "cutter": (-0.2, -0.04, 1.23),
    "conveyor": (0.6, -1.0, 0.85),
    "hmi": (0.92, -0.25, 1.86),
    "estop": (0.66, 0.15, 0.5),
    "door": (-0.3, -0.47, 0.6),
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
    data = {"hero": []}
    for i in range(120):
        hero_cam(i)
        data["hero"].append(project())
    seal_cam()
    data["seal"] = project()
    top_cam()
    data["top"] = project()
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
setup_render()

if MODE == "still":
    hero_cam(0)
    set_frame(12)
    render_to(OUT)
elif MODE == "hero":
    os.makedirs(OUT, exist_ok=True)
    for i in frames_range(120):
        hero_cam(i)
        set_frame(i)
        render_to(os.path.join(OUT, f"h{i:03d}.png"))
elif MODE == "seal":
    os.makedirs(OUT, exist_ok=True)
    seal_cam()
    for i in frames_range(60):
        set_frame(i)
        render_to(os.path.join(OUT, f"s{i:03d}.png"))
elif MODE == "top":
    os.makedirs(OUT, exist_ok=True)
    top_cam()
    for i in frames_range(60):
        set_frame(i)
        render_to(os.path.join(OUT, f"t{i:03d}.png"))
