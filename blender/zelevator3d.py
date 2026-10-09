"""Z형 버킷 엘리베이터 + 조합 저울 + 포장기 3D 모델 · 렌더 (Blender bpy / Cycles)

사용법:
  python3 zelevator3d.py still   out.png      # 확인용 (영웅 컷 0번 프레임)
  python3 zelevator3d.py hero    out_dir/     # 360° 궤도 180프레임, 버킷 순환 (루프)
  python3 zelevator3d.py close   out_dir/     # 투입부 버킷 클로즈업 90프레임 (엠보싱 표면)
  python3 zelevator3d.py line    out_dir/     # 엘리베이터 → 저울 → 포장기 라인 120프레임
  python3 zelevator3d.py chain   out_dir/     # 수직 구간 체인 · 버킷 클로즈업 60프레임 (루프)
  python3 zelevator3d.py anchors out.json     # 컷별 라벨 2D 좌표

환경변수 RES=가로x세로, SAMPLES=n, FRAMES=시작:끝
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

def mat(name, hexc, metal=0.0, rough=0.5, dimple=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexrgb(hexc)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if dimple:  # 엠보싱(오돌토돌한 점) 표면
        tc = nt.nodes.new("ShaderNodeTexCoord")
        vor = nt.nodes.new("ShaderNodeTexVoronoi")
        vor.inputs["Scale"].default_value = dimple
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.6
        nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
        nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

M_SS = mat("stainless", "#CDD3D7", 0.92, 0.26)
M_SS2 = mat("stainless_brushed", "#BFC6CA", 0.85, 0.38)
M_BUCKET = mat("bucket", "#ECEFEC", 0.0, 0.42, dimple=140)
M_DARK = mat("dark", "#2E3236", 0.3, 0.5)
M_PANEL = mat("panel", "#E4E8EA", 0.2, 0.4)
M_RED = mat("red", "#C8402F", 0.1, 0.4)
M_GREEN = mat("green", "#3BA35A", 0.1, 0.4)
M_FOOD = mat("food", "#E6C79A", 0.0, 0.6)
M_FILM = mat("film", "#5B8FD6", 0.1, 0.3)
M_SCREEN = mat("screen", "#1E5E8C", 0.0, 0.2)

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

def box(size, loc, m, rot=(0, 0, 0), parent=None, bevel=0.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, parent, bevel, smooth=False)

def cyl(r, depth, loc, m, rot=(0, 0, 0), parent=None, verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    return finish(bpy.context.object, m, parent)

def cone(r1, r2, depth, loc, m, parent=None, verts=40):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, vertices=verts)
    return finish(bpy.context.object, m, parent)

def rounded(p, rad=0.22):
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

# ---------------- 버킷 순환 경로 (xz 평면, y = 0) ----------------
# 앞쪽(적재) 경로: 아래 수평(→ -x) → 수직 상승 → 위 수평(→ -x) → 배출 후 위로 꺾여 안쪽 경로로 복귀
LOOP2 = [(1.2, 0.75), (0.0, 0.75), (0.0, 3.9), (-1.9, 3.9), (-1.9, 4.35), (0.5, 4.35), (0.5, 1.2), (2.3, 1.2), (2.3, 0.75), (1.2, 0.75)]
PATH = [Vector(p) for p in rounded([(x, 0, z) for x, z in LOOP2], 0.22)]
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
    return PATH[lo].lerp(PATH[hi], t)

# 배출 지점(왼쪽 위 끝)까지의 경로 길이: 여기를 지나면 버킷이 비어 있음
DUMP = CUM[min(range(len(PATH)), key=lambda k: (PATH[k] - Vector((-1.9, 0, 3.98))).length)]

N_BUCKET = 46
SPACING = TOTAL / N_BUCKET
LINK = SPACING / 4
N_LINK = N_BUCKET * 4
BW, BL, BD = 0.42, 0.26, 0.19          # 버킷 폭(y) · 길이(진행 방향) · 깊이
buckets, links = [], []

def bucket_mesh():
    """위가 열린 사다리꼴 버킷"""
    bm = bmesh.new()
    t = [(-BL / 2, -BW / 2, 0), (BL / 2, -BW / 2, 0), (BL / 2, BW / 2, 0), (-BL / 2, BW / 2, 0)]
    b = [(-BL / 2 + 0.05, -BW / 2 + 0.01, -BD), (BL / 2 - 0.05, -BW / 2 + 0.01, -BD), (BL / 2 - 0.05, BW / 2 - 0.01, -BD), (-BL / 2 + 0.05, BW / 2 - 0.01, -BD)]
    vt = [bm.verts.new(p) for p in t]
    vb = [bm.verts.new(p) for p in b]
    bm.faces.new(vb[::-1])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vb[i], vb[j], vt[j], vt[i]))
    me = bpy.data.meshes.new("bucket")
    bm.to_mesh(me)
    bm.free()
    return me

def build_elevator():
    root = bpy.data.objects.new("Elevator", None)
    col.objects.link(root)
    me = bucket_mesh()
    for i in range(N_BUCKET):
        o = bpy.data.objects.new(f"bucket{i}", me)
        col.objects.link(o)
        sol = o.modifiers.new("solid", "SOLIDIFY")
        sol.thickness = 0.012
        finish(o, M_BUCKET, smooth=False)
        # 담긴 재료 (작은 알갱이)
        food = []
        for k in range(7):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=12, ring_count=8,
                                                 location=((k % 3 - 1) * 0.06, (k // 3 - 1) * 0.11 + 0.02 * (k % 2), -0.07 + 0.02 * (k % 2)))
            f = bpy.context.object
            f.scale = (1.0, 0.8, 0.7)
            finish(f, M_FOOD, parent=o)
            food.append(f)
        buckets.append((o, food))
    # 양쪽 체인 (링크 플레이트)
    for i in range(N_LINK):
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(size=1)
            l = bpy.context.object
            l.scale = (LINK * 0.85, 0.012, 0.032)
            bpy.ops.object.transform_apply(scale=True)
            finish(l, M_SS, smooth=False)
            links.append((l, sy))
    # 뒤판 · 프레임
    Y = 0.36
    def plate(x0, x1, z0, z1):
        box((x1 - x0, 0.015, z1 - z0), ((x0 + x1) / 2, Y, (z0 + z1) / 2), M_SS2, parent=root, bevel=0.0)
    plate(-0.35, 2.65, 0.45, 1.55)       # 아래 수평 구간
    plate(-0.35, 0.85, 1.55, 4.7)        # 수직 구간
    plate(-2.25, -0.35, 3.6, 4.7)        # 위 수평 구간
    box((3.1, 0.75, 0.015), (-0.7, 0, 4.72), M_SS2, parent=root, bevel=0.0)        # 위 덮개
    # 앞쪽 테두리 프레임
    def bar(a, b, r=0.025):
        a, b = Vector(a), Vector(b)
        d = b - a
        o = cyl(r, d.length, (a + b) / 2, M_SS, parent=root, verts=12)
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    for y in (-Y, Y):
        for seg in [((-0.35, y, 0.45), (2.65, y, 0.45)), ((2.65, y, 0.45), (2.65, y, 1.55)), ((2.65, y, 1.55), (0.85, y, 1.55)),
                    ((0.85, y, 1.55), (0.85, y, 4.7)), ((0.85, y, 4.7), (-2.25, y, 4.7)), ((-2.25, y, 4.7), (-2.25, y, 3.6)),
                    ((-2.25, y, 3.6), (-0.35, y, 3.6)), ((-0.35, y, 3.6), (-0.35, y, 0.45))]:
            bar(*seg)
    for x in (-0.35, 0.85):
        for z in (1.55, 2.6, 3.6):
            bar((x, -Y, z), (x, Y, z), 0.02)
    # 하단 안전 가드 (앞쪽 낮은 판)
    box((3.0, 0.015, 0.16), (1.15, -Y, 0.53), M_SS2, parent=root, bevel=0.0)
    # 다리 · 수평 조절 발
    for x, y in [(-0.3, -0.3), (-0.3, 0.3), (0.8, -0.3), (0.8, 0.3), (2.6, -0.3), (2.6, 0.3)]:
        box((0.06, 0.06, 0.45), (x, y, 0.225), M_SS, parent=root)
        cyl(0.06, 0.03, (x, y, 0.015), M_DARK, parent=root, verts=16)
    # 진동 피더 (투입 호퍼)
    box((0.7, 0.75, 0.04), (1.75, -0.72, 1.05), M_SS, rot=(math.radians(-8), 0, 0), parent=root)
    for sx in (-1, 1):
        box((0.02, 0.75, 0.16), (1.75 + sx * 0.35, -0.72, 1.12), M_SS, rot=(math.radians(-8), 0, 0), parent=root)
    box((0.7, 0.02, 0.16), (1.75, -1.09, 1.17), M_SS, parent=root)
    box((0.55, 0.5, 0.45), (1.75, -0.75, 0.75), M_PANEL, parent=root, bevel=0.02)     # 진동기 본체
    for k in range(10):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=(1.55 + (k % 5) * 0.09, -0.85 + (k // 5) * 0.12, 1.11))
        finish(bpy.context.object, M_FOOD, parent=root)
    # 배출 슈트
    cone(0.32, 0.12, 0.45, (-1.9, 0, 3.4), M_SS, parent=root)
    # 제어반 (인버터 속도 조절)
    box((0.42, 0.18, 0.6), (0.62, -0.5, 2.1), M_PANEL, parent=root, bevel=0.015)
    box((0.2, 0.01, 0.1), (0.62, -0.595, 2.28), M_SCREEN, parent=root, bevel=0.0)
    for i, (x, m) in enumerate(((0.52, M_GREEN), (0.62, M_RED), (0.72, M_DARK))):
        cyl(0.03, 0.03, (x, -0.6, 2.05), m, rot=(math.radians(90), 0, 0), parent=root, verts=16)
    cyl(0.045, 0.04, (0.62, -0.6, 1.92), M_DARK, rot=(math.radians(90), 0, 0), parent=root, verts=20)   # 속도 노브
    # 사다리
    for sy in (-0.22, 0.22):
        box((0.04, 0.04, 4.3), (1.05, sy, 2.15), M_SS, parent=root)
    for z in range(1, 15):
        cyl(0.015, 0.44, (1.05, 0, z * 0.29), M_SS, rot=(math.radians(90), 0, 0), parent=root, verts=10)
    return root

def build_weigher_packer():
    root = bpy.data.objects.new("Line", None)
    col.objects.link(root)
    cx = -1.9
    # 작업대 (저울 받침)
    box((2.2, 2.0, 0.08), (cx, 0, 2.3), M_SS2, parent=root, bevel=0.0)
    for x in (cx - 1.05, cx + 1.05):
        for y in (-0.95, 0.95):
            box((0.07, 0.07, 2.3), (x, y, 1.15), M_SS, parent=root)
    # 조합 저울: 분산 콘 + 방사형 피더 + 호퍼
    cone(0.12, 0.42, 0.18, (cx, 0, 3.12), M_SS, parent=root)
    cyl(0.32, 0.5, (cx, 0, 2.75), M_SS, parent=root, verts=40)
    for k in range(10):
        a = 2 * math.pi * k / 10
        ca, sa = math.cos(a), math.sin(a)
        box((0.36, 0.11, 0.03), (cx + ca * 0.55, sa * 0.55, 3.0), M_SS, rot=(0, math.radians(-12), a), parent=root)
        box((0.14, 0.13, 0.14), (cx + ca * 0.72, sa * 0.72, 2.85), M_SS2, rot=(0, 0, a), parent=root)
        box((0.14, 0.13, 0.14), (cx + ca * 0.62, sa * 0.62, 2.62), M_SS2, rot=(0, 0, a), parent=root)
    cone(0.7, 0.14, 0.32, (cx, 0, 2.45), M_SS, parent=root)
    # 포장기 (수직 충전 포장기)
    box((1.3, 1.1, 1.75), (cx, 0, 0.88), M_PANEL, parent=root, bevel=0.03)
    box((0.5, 0.02, 0.32), (cx + 0.25, -0.56, 1.35), M_SCREEN, parent=root, bevel=0.0)
    cyl(0.1, 0.5, (cx, 0, 2.0), M_SS, parent=root, verts=24)             # 성형 튜브
    cyl(0.28, 0.75, (cx, 0.75, 1.5), M_FILM, rot=(0, math.radians(90), 0), parent=root, verts=40)   # 필름 롤
    for k in range(3):
        box((0.22, 0.06, 0.32), (cx - 0.35 + k * 0.35, -0.75, 0.25), M_FILM, rot=(math.radians(70), 0, 0), parent=root, bevel=0.03)  # 완성 포장
    box((1.4, 0.4, 0.05), (cx, -0.85, 0.16), M_DARK, parent=root)
    return root

def set_frame(t, loop):
    """loop 프레임 동안 버킷이 한 칸 이동 → 이음매 없이 반복"""
    shift = SPACING * (t % loop) / loop
    for i, (o, food) in enumerate(buckets):
        d = i * SPACING + shift
        p = path_at(d)
        o.location = p + Vector((0, 0, 0.21))
        # 배출 지점(왼쪽 위 끝)에서 기울여 쏟고, 돌아오면서 다시 수평
        a = max(0.0, min(1.0, (p.z - 3.9) / 0.22))
        b = 1 - max(0.0, min(1.0, (p.x + 1.9) / 0.35))
        tilt = a * b if p.x < -1.5 else 0.0
        o.rotation_euler = (0, math.radians(-125 * tilt), 0)
        dd = d % TOTAL
        # 피더(x≈1.75) 아래부터 배출 지점까지 재료가 담김. 경로 시작점(x=1.2)이 피더보다 앞이라 끝부분도 포함
        loaded = dd <= DUMP or dd >= TOTAL - 0.5
        for f in food:
            f.hide_render = not loaded
    for i, (l, sy) in enumerate(links):
        d = (i // 2) * LINK + shift
        p = path_at(d)
        q = path_at(d + 0.01)
        l.location = p + Vector((0, sy * 0.25, 0.12))
        dv = q - p
        l.rotation_euler = (0, -math.atan2(dv.z, dv.x), 0)

# ---------------- 조명 · 렌더 ----------------
def light(kind, loc, energy, size=1.0, target=(0, 0, 2)):
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

def hero_cam(i, n=180):
    a = math.radians(-30 - 360 * i / n)
    R, H = 9.2, 3.6
    cam.location = (-0.4 + R * math.sin(a), -R * math.cos(a), H)
    cam_data.lens = 35
    aim((-0.4, 0, 2.3))

def close_cam():
    cam.location = (1.0, -2.6, 1.55)
    cam_data.lens = 40
    aim((1.25, 0.0, 0.9))

def line_cam(i, n=120):
    t = i / (n - 1)
    t = t * t * (3 - 2 * t)
    cam.location = Vector((-6.2, -6.4, 2.6)).lerp(Vector((-4.6, -5.2, 3.6)), t)
    cam_data.lens = 33
    aim(Vector((-1.2, 0, 2.2)).lerp(Vector((-1.0, 0, 2.6)), t))

def chain_cam():
    cam.location = (1.05, -1.25, 2.9)
    cam_data.lens = 38
    aim((0.15, 0.1, 2.55))

PTS = {
    "feeder": (1.75, -0.95, 1.15),
    "bucket": (1.0, -0.2, 0.9),
    "column": (0.25, -0.36, 2.9),
    "top": (-1.0, -0.36, 4.1),
    "discharge": (-1.9, -0.25, 3.4),
    "weigher": (-1.9, -0.75, 2.95),
    "packer": (-1.9, -0.56, 1.0),
    "control": (0.62, -0.6, 2.15),
    "knob": (0.62, -0.62, 1.92),
    "chain": (0.0, -0.25, 2.5),
    "ladder": (1.05, -0.22, 2.4),
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
    data = {"hero": [], "line": []}
    for i in range(180):
        hero_cam(i)
        data["hero"].append(project())
    close_cam()
    data["close"] = project()
    for i in range(120):
        line_cam(i)
        data["line"].append(project())
    chain_cam()
    data["chain"] = project()
    with open(OUT, "w") as f:
        json.dump(data, f)
    sys.exit(0)

build_elevator()
build_weigher_packer()
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
bpy.context.object.is_shadow_catcher = True
light("SUN", (6, -8, 12), 3.0, target=(0, 0, 0))
light("AREA", (-7, -7, 6), 2600, 7.0, target=(-0.5, 0, 2.2))
light("AREA", (6, 6, 7), 1800, 7.0, target=(-0.5, 0, 2.2))
light("AREA", (3, -5, 2), 900, 4.0, target=(1.2, 0, 1.0))
setup_render()

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
elif MODE == "line":
    os.makedirs(OUT, exist_ok=True)
    for i in frames_range(120):
        line_cam(i)
        set_frame(i, 60)
        render_to(os.path.join(OUT, f"l{i:03d}.png"))
elif MODE == "chain":
    os.makedirs(OUT, exist_ok=True)
    chain_cam()
    for i in frames_range(60):
        set_frame(i, 60)
        render_to(os.path.join(OUT, f"k{i:03d}.png"))
