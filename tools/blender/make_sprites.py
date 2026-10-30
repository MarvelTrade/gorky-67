"""Рендер спрайтов GORKY-67 из простых моделей Blender (вид сверху, прозрачный фон).

Запуск (Blender 4.2+):
  blender -b --factory-startup --python tools/blender/make_sprites.py -- <папка вывода> [ключ ...]

Модели собираются здесь же из примитивов — никаких внешних ассетов. 1 единица Blender = 1 px спрайта.
Нос/ствол смотрит в +X: в игре rotation 0 — вправо. Размер кадра совпадает с текстурой в BootScene,
поэтому хитбоксы и поведение не меняются.
"""
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "sprites_out")
ONLY = set(argv[1:])
SS = 4  # суперсэмплинг: рендер в SS раз крупнее для сглаженных краёв, Blender сам уменьшает


def hexrgb(h, a=1.0):
    r, g, b = ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255
    return (r ** 2.2, g ** 2.2, b ** 2.2, a)  # sRGB → линейный


_mats = {}


def mat(name, color, rough=0.55, metal=0.0, emit=0.0, alpha=1.0):
    key = (name, color, alpha)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = hexrgb(color)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = hexrgb(color)
        p.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
    _mats[key] = m
    return m


def put(obj, m, smooth=False):
    obj.data.materials.append(m)
    if smooth:
        bpy.ops.object.shade_smooth()
    return obj


def box(size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = (size[0], size[1], size[2])
    return put(o, m)


def ball(size, loc, m, segs=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, radius=0.5, location=loc)
    o = bpy.context.object
    o.scale = size
    return put(o, m, smooth=True)


def cyl(r, depth, loc, m, axis="z", verts=20):
    rot = {"z": (0, 0, 0), "x": (0, math.pi / 2, 0), "y": (math.pi / 2, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    return put(bpy.context.object, m, smooth=True)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def setup_scene(w, h):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = w * SS, h * SS
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    # Контур рисуется после рендера по прозрачности (outline()): Freestyle обводил каждую деталь и всё темнил
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.7, 0.72, 0.75, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55

    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = max(w, h)
    cam.clip_end = 3000
    co = bpy.data.objects.new("cam", cam)
    co.location = (0, 0, 800)
    sc.collection.objects.link(co)
    sc.camera = co
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 2.2
    sun.angle = math.radians(25)  # мягкие тени: детали не тонут в черноте
    so = bpy.data.objects.new("sun", sun)
    so.rotation_euler = (math.radians(20), math.radians(-15), 0)  # почти сверху, чуть слева-сверху
    sc.collection.objects.link(so)


def oblique(k=1.0):
    """Косоугольная проекция как у домов в игре (Buildings): высота Z уходит вверх по экрану (+Y),
    земля не сжимается. Камера смотрит строго сверху, а модель скашивается: Y' = Y + k·Z."""
    from mathutils import Matrix
    S = Matrix(((1, 0, 0, 0), (0, 1, k, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.matrix_world = S @ o.matrix_world


def render(key, w, h, build, glow=None, skew=False):
    if ONLY and key not in ONLY:
        return
    clear()
    setup_scene(w, h)
    build()
    if skew:
        oblique()
    path = os.path.join(OUT, f"{key}.png")
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    # Уменьшаем до размера кадра (сглаживание за счёт SS) и обводим силуэт
    img = bpy.data.images.load(path)
    img.scale(w, h)
    outline(img, w, h, glow)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    print("sprite", key, w, h, "->", path)


def outline(img, w, h, glow=None, color=(0.05, 0.06, 0.05)):
    """Тёмная обводка 1 px снаружи силуэта — главное для читаемости на телефоне.
    glow = (0xRRGGBB, радиус px, сила): мягкий ореол под спрайтом (свечение «Зари»)."""
    import numpy as np
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    a = px[..., 3]
    solid = a > 0.35
    pad = np.pad(solid, 1)  # без заворота через край кадра (np.roll переносил хвост на другую сторону)
    near = np.zeros_like(solid)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        near |= pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
    ring = near & ~solid
    px[ring, :3] = color
    px[ring, 3] = 1.0
    if glow:
        hexc, radius, strength = glow
        m = (px[..., 3] > 0.35).astype(np.float32)
        for _ in range(radius):  # размытие маски коробочным фильтром 3×3 — ореол спадает к краю
            p = np.pad(m, 1)
            m = sum(p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
            m = np.maximum(m, (px[..., 3] > 0.35))
        ga = np.clip(m * strength, 0, 1) * (1 - px[..., 3])  # только там, где спрайт прозрачен
        gc = np.array(hexrgb(hexc)[:3], dtype=np.float32)
        out_a = px[..., 3] + ga
        px[..., :3] = (px[..., :3] * px[..., 3:4] + gc * ga[..., None]) / np.maximum(out_a, 1e-6)[..., None]
        px[..., 3] = out_a
    img.pixels[:] = px.ravel()


# ---------- модели ----------

HELI_BODY = 0xb8c4cc   # светлый серо-голубой: свой, читается на асфальте и среди тёмно-зелёной техники
HELI_DARK = 0x56626c
HELI_GLASS = 0x7fe3ff
HELI_ACCENT = 0x7fe3ff   # голубой, не жёлтый: жёлтое — цвет «Зари», вертолёт сливался с заражёнными


def heli():
    body, dark = mat("body", HELI_BODY, 0.45), mat("dark", HELI_DARK, 0.6)
    glass = mat("glass", HELI_GLASS, 0.15, emit=0.6)
    acc = mat("acc", HELI_ACCENT, 0.4)
    ball((34, 15, 11), (6, 0, 6), body)                  # фюзеляж
    ball((12, 10, 7), (17, 0, 9), glass)                 # кабина
    cyl(2.6, 26, (-17, 0, 6), body, axis="x", verts=12)  # хвостовая балка
    box((5, 2, 7), (-30, 0, 8), dark)                    # киль
    box((8, 4, 1.5), (-30, 3.5, 6), dark)                # стабилизатор
    cyl(4.5, 1, (-30, 5.5, 8), dark, axis="y", verts=16) # хвостовой винт сбоку
    box((7, 30, 1.6), (4, 0, 4), dark)                   # пилоны
    for s in (-1, 1):
        cyl(2.6, 13, (5, s * 15.5, 3), dark, axis="x", verts=12)   # ракетные блоки
        ball((3, 3, 3), (11.5, s * 15.5, 3), acc)                  # голубые носики — «вооружён»
    box((10, 2.2, 1), (-4, 0, 11.6), acc)                # полоса на спине: где «верх»
    cyl(2.2, 3, (6, 0, 12), dark, verts=12)              # втулка винта (сам винт — отдельный спрайт)


def rotor():
    blade = mat("blade", 0x2a2f33, 0.6, alpha=0.75)
    for i in range(4):
        a = i * math.pi / 2
        box((34, 3.2, 0.6), (17 * math.cos(a), 17 * math.sin(a), 0), blade, rot=(0, 0, a))
    cyl(3, 1.2, (0, 0, 0.5), mat("hub", 0x56626c, 0.5), verts=12)


ARMY = 0x55693f
ARMY_DARK = 0x2b3522
ARMY_LIGHT = 0x7e9460


def tank():
    hull, dark, light = mat("hull", ARMY), mat("adark", ARMY_DARK, 0.8), mat("alight", ARMY_LIGHT)
    for s in (-1, 1):
        box((54, 9, 7), (0, s * 15, 3.5), dark)             # гусеницы
        for i in range(7):
            box((2, 9.4, 7.4), (-24 + i * 8, s * 15, 3.5), mat("track", 0x1b2116, 0.9))
    box((48, 22, 8), (-1, 0, 6), hull)                       # корпус
    box((10, 18, 2), (19, 0, 10), light)                     # лобовой лист светлее — видно перед
    cyl(9.5, 6, (-6, 0, 12), hull, verts=24)                 # башня
    cyl(4, 1.5, (-9, -3, 15.5), dark, verts=12)              # люк
    cyl(1.8, 30, (17, 0, 12), dark, axis="x", verts=10)      # ствол — до края кадра: видно, куда целится
    cyl(2.6, 3, (27.5, 0, 12), dark, axis="x", verts=10)     # дульный тормоз


def aa():
    base, dark, light = mat("hull", ARMY), mat("adark", ARMY_DARK, 0.8), mat("alight", ARMY_LIGHT)
    box((30, 30, 4), (0, 0, 2), dark)                         # платформа
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((5, 5, 3), (sx * 12, sy * 12, 4), base)       # опоры по углам
    cyl(10, 6, (-2, 0, 7), base, verts=24)                   # поворотная башня
    box((8, 14, 3), (-4, 0, 11), light)                      # кабина наводчика — светлое пятно сверху
    for s in (-1, 1):
        cyl(1.5, 18, (10, s * 4, 9), dark, axis="x", verts=8)  # спаренные стволы — отличает от танка
    cyl(4, 1, (-9, 7, 12), mat("radar", 0x9aa7a0, 0.4), verts=16)  # тарелка радара


INFECTED = 0xff7a2e
INFECTED_HEAD = 0xffb070
GLOW = 0xffc83a


def infantry():
    skin, head = mat("skin", INFECTED, 0.6), mat("head", INFECTED_HEAD, 0.5)
    ball((9, 15, 6), (-1, 0, 4), skin)                   # плечи (свечение «Зари» — ореолом после рендера)
    ball((8, 8, 8), (1, 0, 8), head)                     # голова
    for s in (-1, 1):
        cyl(1.6, 9, (5, s * 5.5, 5), skin, axis="x", verts=8)  # руки тянутся вперёд — видно направление


def jeep():
    body = mat("jbody", 0x5d6234, 0.6)                   # выцветший оливковый
    dark, rust = mat("jdark", 0x22261a, 0.9), mat("rust", INFECTED, 0.5, emit=0.6)
    glass = mat("jglass", 0x1d2a2e, 0.2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(3, 3, (sx * 9, sy * 8.5, 3), dark, axis="y", verts=10)  # колёса
    box((26, 15, 6), (0, 0, 5), body)                    # кузов
    box((6, 13, 3), (3, 0, 9), glass)                    # лобовое стекло
    box((8, 13, 2), (-6, 0, 8.5), body)                  # крыша/тент
    ball((5, 4, 2), (-8, 3, 9.5), rust)                  # пятна «Зари» — заражённая машина, не армия
    ball((4, 3, 2), (8, -4, 8.2), rust)
    box((2, 12, 2), (13, 0, 5), dark)                    # бампер — где перед


def boss():
    flesh = mat("flesh", 0x5a4a6a, 0.7)
    dark, maw = mat("bdark", 0x2a2030, 0.8), mat("maw", 0x120c14, 0.9)
    pus = mat("pus", 0xff8a2e, 0.4, emit=1.2)
    for i in range(10):                                  # отростки по кругу (аура — ореолом после рендера)
        a = i * 2 * math.pi / 10 + 0.3
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=5, radius2=0.5, depth=16,
                                        location=(36 * math.cos(a), 36 * math.sin(a), 6),
                                        rotation=(0, math.pi / 2, a))
        put(bpy.context.object, dark, smooth=True)
    ball((70, 62, 26), (-4, 0, 13), flesh, segs=32)      # туша
    for (x, y, r) in ((-18, -10, 7), (-8, 14, 6), (-22, 12, 5), (2, -16, 5), (-30, -2, 6), (-6, 0, 8)):
        ball((r, r, r * 0.8), (x, y, 25), pus)           # нарывы светятся
    ball((22, 26, 14), (24, 0, 16), maw, segs=24)        # пасть — смотрит вперёд
    ball((8, 14, 6), (30, 0, 20), mat("tongue", GLOW, 0.4, emit=1.5))  # свечение в пасти


SPRITES = [
    ("heli", 70, 48, heli, None),
    ("rotor", 72, 72, rotor, None),
    ("tank", 58, 40, tank, None),
    ("aa", 34, 34, aa, None),
    ("infantry", 26, 26, infantry, (GLOW, 5, 0.9)),
    ("jeep", 32, 22, jeep, None),
    ("boss", 100, 100, boss, (GLOW, 9, 0.8)),
]

# ---------- высокие сооружения, в проекции 3/4 как дома ----------
# R — радиус основания (= круг столкновения AIR.towers.*.radius в config.js), H — высота на экране, px.
# Кадр: ширина 2·(R+PAD)+запас, высота 2·(R+PAD)+H. Основание — внизу кадра; игра ставит спрайт
# так, чтобы центр основания совпал с кругом столкновения (towers.json → originY).
PAD = 6
TOWERS = {
    "towerRadio": {"R": 30, "H": 170},
    "towerWater": {"R": 22, "H": 72},
    "towerBell": {"R": 17, "H": 92},
    "towerChimney": {"R": 13, "H": 130},
}


def tower_frame(key):
    t = TOWERS[key]
    w = 2 * (t["R"] + PAD) + 8
    h = 2 * (t["R"] + PAD) + t["H"]
    base_y = -h / 2 + t["R"] + PAD  # центр основания в координатах кадра (Blender, +Y вверх)
    return w, h, base_y


def tower_radio():
    """Решётчатая башня из трёх гиперболоидов (прямые стержни между кольцами — по мотивам инженерных
    вышек 1920-х, не копия конкретной): нижний широкий, выше — уже, наверху площадка и красный огонь."""
    _, _, by = tower_frame("towerRadio")
    steel, dark = mat("steel", 0x9aa3ab, 0.5, 0.6), mat("steel_d", 0x6d757c, 0.6, 0.6)
    sections = [(28, 18, 0, 62), (18, 12, 62, 112), (12, 8, 112, 158)]
    for r0, r1, z0, z1 in sections:
        n = 18
        for i in range(n):
            for twist in (0.9, -0.9):  # стержни крест-накрест — гиперболоид из прямых
                a0 = i * 2 * math.pi / n
                a1 = a0 + twist
                p0 = (r0 * math.cos(a0), by + r0 * math.sin(a0), z0)
                p1 = (r1 * math.cos(a1), by + r1 * math.sin(a1), z1)
                strut(p0, p1, 0.55, steel)
        for z, r in ((z0, r0), (z1, r1)):
            bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.9, location=(0, by, z))
            put(bpy.context.object, dark)
    cyl(9, 3, (0, by, 160), dark, verts=16)                       # площадка
    cyl(1.2, 10, (0, by, 167), dark, verts=8)                      # мачта
    ball((4, 4, 4), (0, by, 173), mat("red", 0xff3b30, 0.3, emit=3.0))  # заградительный огонь


def strut(p0, p1, r, m):
    dx, dy, dz = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=r, depth=length,
                                        location=((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2))
    o = bpy.context.object
    o.rotation_mode = "QUATERNION"
    from mathutils import Vector
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector((dx, dy, dz)))
    put(o, m)


def tower_water():
    _, _, by = tower_frame("towerWater")
    brick, tank, roof = mat("brick", 0x9a5a44, 0.8), mat("tank", 0x8f9aa3, 0.5, 0.4), mat("troof", 0x5f676e, 0.6)
    cyl(13, 46, (0, by, 23), brick, verts=20)          # кирпичный ствол
    for z in (12, 30):
        cyl(13.6, 1.5, (0, by, z), mat("brick_d", 0x6e3c2c, 0.9), verts=20)  # пояса
    cyl(22, 20, (0, by, 56), tank, verts=28)           # бак
    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=23, radius2=3, depth=8, location=(0, by, 70))
    put(bpy.context.object, roof, smooth=True)


def tower_bell():
    _, _, by = tower_frame("towerBell")
    wall, trim = mat("wall", 0xe0ddd2, 0.6), mat("trim", 0xb8b3a6, 0.6)
    dome, gold = mat("dome", 0x3d6b4f, 0.4, 0.3), mat("gold", 0xe0b84a, 0.3, 0.8)
    box((30, 30, 36), (0, by, 18), wall)               # нижний четверик
    box((32, 32, 2), (0, by, 36), trim)
    box((24, 24, 26), (0, by, 50), wall)               # ярус звона
    for s in (-1, 1):                                  # проёмы звона — тёмные, видно, что колокольня
        box((8, 1, 12), (0, by + s * 12.2, 50), mat("arch", 0x2a2a2a, 0.9))
        box((1, 8, 12), (s * 12.2, by, 50), mat("arch", 0x2a2a2a, 0.9))
    cyl(9, 10, (0, by, 68), wall, verts=16)            # барабан
    ball((18, 18, 16), (0, by, 77), dome)              # купол
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=1.6, radius2=0.2, depth=12, location=(0, by, 90))
    put(bpy.context.object, gold)


def tower_chimney():
    _, _, by = tower_frame("towerChimney")
    red, white = mat("cred", 0xb8473a, 0.8), mat("cwhite", 0xe8e2d6, 0.8)
    n = 8
    for i in range(n):                                 # сужается кверху, красно-белые кольца
        z0 = i * 16
        r = 12 - i * 0.6
        cyl(r, 16, (0, by, z0 + 8), red if i % 2 == 0 else white, verts=20)
    cyl(8, 1, (0, by, n * 16 + 0.6), mat("soot", 0x141414, 0.9), verts=20)  # жерло


TOWER_SPRITES = [
    ("towerRadio", tower_radio),
    ("towerWater", tower_water),
    ("towerBell", tower_bell),
    ("towerChimney", tower_chimney),
]

os.makedirs(OUT, exist_ok=True)
for key, w, h, build, glow in SPRITES:
    render(key, w, h, build, glow)

meta = {}
for key, build in TOWER_SPRITES:
    if ONLY and key not in ONLY:
        continue
    w, h, base_y = tower_frame(key)
    render(key, w, h, build, skew=True)
    # Доля высоты кадра, где центр основания (сверху вниз) — для setOrigin в игре
    meta[key] = {"w": w, "h": h, "originY": round((h / 2 - base_y) / h, 4)}
if meta:
    import json
    path = os.path.join(OUT, "towers.json")
    old = json.load(open(path)) if os.path.exists(path) else {}
    old.update(meta)
    json.dump(old, open(path, "w"), indent=1)
    print("meta", path)
