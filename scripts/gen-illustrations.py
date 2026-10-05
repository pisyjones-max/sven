#!/usr/bin/env python3
"""Генерирует векторные иллюстрации для карточек разделов (public/ill/<slug>.svg).
Настоящие фото можно положить в public/cat/<slug>.jpg: сайт покажет их поверх иллюстраций."""
import os, random

W, H = 400, 600
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'ill')
os.makedirs(OUT, exist_ok=True)

def svg(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice"><defs>{defs}</defs>{body}</svg>'

def sky(c1, c2):
    return (f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>', f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')

def sun(x=320, y=110, r=46, c='#FFE08A'):
    return f'<circle cx="{x}" cy="{y}" r="{r+22}" fill="{c}" opacity=".25"/><circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'

def cloud(x, y, s=1, o=.9):
    return f'<g transform="translate({x} {y}) scale({s})" opacity="{o}" fill="#fff"><ellipse cx="0" cy="0" rx="46" ry="16"/><ellipse cx="-18" cy="-12" rx="24" ry="16"/><ellipse cx="14" cy="-16" rx="28" ry="18"/></g>'

def ground(y, c1, c2):
    return (f'<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>', f'<rect y="{y}" width="{W}" height="{H-y}" fill="url(#gr)"/>')

def tree(x, y, s=1, c='#2F855A'):
    return f'<g transform="translate({x} {y}) scale({s})"><rect x="-5" y="0" width="10" height="46" fill="#6B4A2B"/><circle cx="0" cy="-8" r="34" fill="{c}"/><circle cx="-18" cy="8" r="22" fill="{c}" opacity=".9"/><circle cx="20" cy="6" r="24" fill="{c}" opacity=".9"/></g>'

def house(x, y, w, h, wall, roof, door='#7C4A21', win='#BEE3F8'):
    rh = h * .55
    body = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{wall}"/>'
    body += f'<polygon points="{x-12},{y} {x+w/2},{y-rh} {x+w+12},{y}" fill="{roof}"/>'
    body += f'<rect x="{x+w*0.42}" y="{y+h*0.42}" width="{w*0.16}" height="{h*0.58}" fill="{door}"/>'
    for wx in (x+w*0.12, x+w*0.68):
        body += f'<rect x="{wx}" y="{y+h*0.2}" width="{w*0.2}" height="{h*0.22}" fill="{win}" stroke="#fff" stroke-width="3"/>'
    body += f'<rect x="{x+w*0.74}" y="{y-rh*0.7}" width="{w*0.08}" height="{rh*0.5}" fill="{roof}"/>'
    return body

scenes = {}

# строят и продают дома: ряд коттеджей
d, s = sky('#7DC4F5', '#FFE9C7')
d2, g = ground(430, '#7BC47F', '#3F8F55')
scenes['stroyat-i-prodayut'] = (d + d2, s + sun() + cloud(80, 90) + cloud(250, 170, .7) + g +
    '<path d="M0 520 Q200 470 400 520 L400 600 L0 600Z" fill="#D8C7A3" opacity=".8"/>' +
    house(30, 340, 110, 90, '#F6E7CF', '#C0553A') + house(160, 320, 130, 110, '#FFF', '#2B4C7E') + house(305, 350, 90, 80, '#EBD5B3', '#8B3A3A') +
    tree(15, 380, .8) + tree(385, 395, .7))

# под заказ: каркас и кран
d, s = sky('#9AD4F7', '#F7EBD4')
d2, g = ground(450, '#C9B48A', '#9C8860')
frame = '<g stroke="#B8793B" stroke-width="7" fill="none" stroke-linecap="round">' \
        '<rect x="70" y="330" width="230" height="130"/><line x1="70" y1="330" x2="300" y2="460"/><line x1="300" y1="330" x2="70" y2="460"/>' \
        '<line x1="185" y1="330" x2="185" y2="460"/><polyline points="60,330 185,230 310,330"/><line x1="185" y1="230" x2="185" y2="330"/></g>'
crane = '<g stroke="#F59E0B" stroke-width="6" fill="none"><line x1="345" y1="450" x2="345" y2="110"/><line x1="230" y1="125" x2="395" y2="125"/>' \
        '<line x1="345" y1="125" x2="345" y2="80"/><polyline points="345,80 230,125 345,125"/><line x1="255" y1="125" x2="255" y2="215"/></g>' \
        '<rect x="238" y="215" width="34" height="22" fill="#374151"/>'
scenes['pod-zakaz'] = (d + d2, s + sun(70, 100, 38) + cloud(180, 80, .8) + g + frame + crane +
    '<rect x="40" y="470" width="90" height="14" fill="#8B6B3E"/><rect x="40" y="484" width="90" height="14" fill="#A07A45"/>')

# готовые дома: один красивый дом
d, s = sky('#6EB6F2', '#FDEBD0')
d2, g = ground(440, '#86CB7E', '#3E8E57')
scenes['gotovye-doma'] = (d + d2, s + sun(70, 110) + cloud(260, 90) + g +
    house(70, 270, 260, 170, '#FBF3E6', '#B4452F') + tree(40, 400, 1) + tree(375, 410, .9, '#276749') +
    '<path d="M185 440 L215 440 L260 600 L140 600Z" fill="#E7D8BE"/>' +
    '<g fill="#E53E3E"><circle cx="105" cy="450" r="6"/><circle cx="120" cy="455" r="6"/><circle cx="310" cy="452" r="6"/></g>')

# забор
d, s = sky('#8CCBF2', '#FFF1D6')
d2, g = ground(470, '#6DB872', '#357A4B')
planks = ''
for i in range(11):
    x = -10 + i * 40
    top = 250 + (i % 2) * 6
    planks += f'<path d="M{x} 470 L{x} {top+16} L{x+16} {top} L{x+32} {top+16} L{x+32} 470Z" fill="#E8D5B0"/><rect x="{x+4}" y="{top+30}" width="2" height="{440-top}" fill="#D2BA8C"/>'
scenes['zabor'] = (d + d2, s + sun(330, 120, 40) + cloud(100, 100) + g + planks +
    '<rect x="0" y="330" width="400" height="14" fill="#B8935A"/><rect x="0" y="410" width="400" height="14" fill="#B8935A"/>' +
    '<g fill="#3F8F55"><ellipse cx="60" cy="478" rx="40" ry="14"/><ellipse cx="320" cy="482" rx="50" ry="16"/></g>')

# кровля: черепица и труба
d, s = sky('#7BBCEB', '#FCE9CB')
rows = ''
for r in range(9):
    y = 200 + r * 46
    off = 0 if r % 2 == 0 else 22
    for c in range(-1, 10):
        x = c * 44 + off
        rows += f'<path d="M{x} {y} h44 v22 q-22 24 -44 0Z" fill="{["#B5472E","#A33C27"][(r+c)%2]}" stroke="#7A2A1B" stroke-width="2"/>'
roof = f'<polygon points="-40,600 140,170 460,170 440,600" fill="#8B3A25"/>'
scenes['krovlya'] = (d, s + sun(310, 100, 40) + cloud(90, 90) +
    '<clipPath id="rf"><polygon points="-40,600 120,180 440,180 440,600"/></clipPath><g clip-path="url(#rf)"><rect width="400" height="600" fill="#A33C27"/>' + rows + '</g>' +
    '<rect x="270" y="90" width="46" height="120" fill="#C9B79C"/><rect x="262" y="82" width="62" height="16" fill="#7A6B55"/>')

# гараж
d, s = sky('#9ECDF3', '#F3E8D3')
d2, g = ground(470, '#B9B2A5', '#8E887B')
panels = ''.join(f'<rect x="90" y="{300+i*40}" width="220" height="34" rx="3" fill="#F3F4F6" stroke="#CBD5E1" stroke-width="2"/>' for i in range(4))
car = '<g><path d="M110 530 q10-46 60-52 h70 q44 4 62 52Z" fill="#2563EB"/><rect x="100" y="526" width="220" height="30" rx="10" fill="#1D4ED8"/><circle cx="150" cy="562" r="20" fill="#111827"/><circle cx="270" cy="562" r="20" fill="#111827"/><path d="M165 484 h60 l24 42 h-100Z" fill="#BFDBFE"/></g>'
scenes['garazh'] = (d + d2, s + sun(60, 100, 36) + cloud(300, 130, .8) + g +
    '<polygon points="60,290 200,230 340,290" fill="#475569"/><rect x="70" y="290" width="260" height="180" fill="#CBD5E1"/>' + panels + car)

# парковка плиткой
d, s = sky('#A5D5F5', '#F5EBDD')
tiles = ''
for r in range(12):
    y = 330 + r * 24
    for c in range(-1, 10):
        x = c * 50 + (25 if r % 2 else 0)
        tiles += f'<rect x="{x}" y="{y}" width="48" height="22" fill="{["#C7C2B8","#B8B2A6","#D0CBC0"][(r*3+c)%3]}" rx="1"/>'
scenes['parkovka-plitka'] = (d, s + sun(320, 100, 38) + cloud(100, 110) +
    '<rect y="250" width="400" height="90" fill="#6DB872"/><g fill="#2F855A"><circle cx="50" cy="270" r="30"/><circle cx="340" cy="262" r="36"/></g>' + tiles +
    '<path d="M60 470 q8-34 44-38 h50 q32 3 44 38Z" fill="#DC2626"/><rect x="52" y="466" width="152" height="22" rx="8" fill="#B91C1C"/><circle cx="92" cy="492" r="14" fill="#111827"/><circle cx="172" cy="492" r="14" fill="#111827"/>')

# покос травы
d, s = sky('#8FD0F5', '#F9F1D8')
random.seed(4)
blades = ''
for i in range(160):
    x = random.randint(-10, 410); h = random.randint(60, 190); b = 600
    lean = random.randint(-14, 14)
    col = random.choice(['#3F9B4F', '#56B35E', '#2F8443', '#6CC36C'])
    blades += f'<path d="M{x} {b} q{lean} {-h*0.5} {lean*1.5} {-h}" stroke="{col}" stroke-width="5" fill="none" stroke-linecap="round"/>'
mower = '<g><rect x="150" y="390" width="130" height="64" rx="14" fill="#DC2626"/><rect x="170" y="370" width="60" height="30" rx="6" fill="#991B1B"/><circle cx="175" cy="466" r="24" fill="#1F2937"/><circle cx="262" cy="466" r="24" fill="#1F2937"/><line x1="270" y1="400" x2="350" y2="300" stroke="#374151" stroke-width="8" stroke-linecap="round"/><line x1="335" y1="300" x2="372" y2="312" stroke="#374151" stroke-width="8" stroke-linecap="round"/></g>'
scenes['pokos-travy'] = (d, s + sun(70, 100, 40) + cloud(280, 100, .9) +
    '<rect y="310" width="400" height="290" fill="#4FA85A"/>' + blades + mower)

# вывоз мусора
d, s = sky('#9CCBEF', '#F1E7D6')
d2, g = ground(480, '#9A9A92', '#6E6E68')
truck = '<g><rect x="40" y="340" width="190" height="130" rx="8" fill="#16A34A"/><rect x="40" y="340" width="190" height="26" fill="#15803D"/><path d="M230 380 h70 l40 50 v40 h-110Z" fill="#F59E0B"/><path d="M246 392 h44 l28 36 h-72Z" fill="#BFDBFE"/><circle cx="100" cy="478" r="26" fill="#111827"/><circle cx="290" cy="478" r="26" fill="#111827"/><circle cx="100" cy="478" r="11" fill="#9CA3AF"/><circle cx="290" cy="478" r="11" fill="#9CA3AF"/></g>'
bags = '<g fill="#1F2937"><ellipse cx="40" cy="520" rx="30" ry="34"/><ellipse cx="86" cy="528" rx="26" ry="28"/><ellipse cx="350" cy="526" rx="28" ry="30"/></g><g stroke="#6B7280" stroke-width="3"><line x1="40" y1="486" x2="40" y2="494"/><line x1="350" y1="496" x2="350" y2="504"/></g>'
scenes['vyvoz-musora'] = (d + d2, s + sun(320, 100, 36) + cloud(100, 100) + g + truck + bags)

# откачка септика
d, s = sky('#92CBF1', '#F2EAD6')
d2, g = ground(470, '#80C478', '#3F8B55')
tank = '<g><rect x="50" y="330" width="230" height="110" rx="55" fill="#2563EB"/><rect x="50" y="330" width="230" height="110" rx="55" fill="url(#shine)"/><path d="M280 370 h60 l36 46 v34 h-96Z" fill="#F59E0B"/><path d="M294 382 h38 l24 30 h-62Z" fill="#BFDBFE"/><circle cx="110" cy="458" r="24" fill="#111827"/><circle cx="320" cy="458" r="24" fill="#111827"/><circle cx="110" cy="458" r="10" fill="#9CA3AF"/><circle cx="320" cy="458" r="10" fill="#9CA3AF"/><rect x="150" y="318" width="40" height="14" rx="4" fill="#1E3A8A"/></g>'
hose = '<path d="M60 400 q-50 30 -40 100 q10 40 70 50" stroke="#374151" stroke-width="12" fill="none" stroke-linecap="round"/><ellipse cx="110" cy="556" rx="44" ry="14" fill="#6B5B45"/><ellipse cx="110" cy="552" rx="34" ry="9" fill="#2D241A"/>'
shine = '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>'
scenes['otkachka-septika'] = (d + d2 + shine, s + sun(60, 100, 36) + cloud(280, 110, .9) + g + tank + hose)

# уборка снега
d, s = sky('#9FB8D6', '#EAF1F8')
d2, g = ground(440, '#FFFFFF', '#D5E3F1')
flakes = ''.join(f'<circle cx="{random.randint(0,400)}" cy="{random.randint(0,440)}" r="{random.choice([2,3,4,5])}" fill="#fff" opacity=".85"/>' for _ in range(70))
scenes['uborka-snega'] = (d + d2, s + flakes + g +
    house(60, 290, 150, 120, '#E5DCC8', '#64748B') + '<path d="M44 290 q82 -22 190 0 v10 h-190Z" fill="#fff"/>' +
    '<g><rect x="230" y="450" width="130" height="50" rx="10" fill="#F59E0B"/><rect x="250" y="420" width="50" height="36" rx="6" fill="#BFDBFE"/><circle cx="262" cy="508" r="22" fill="#111827"/><circle cx="338" cy="508" r="22" fill="#111827"/><polygon points="220,470 180,508 220,508" fill="#9CA3AF"/></g>' +
    '<ellipse cx="90" cy="500" rx="80" ry="26" fill="#fff"/><ellipse cx="60" cy="480" rx="44" ry="26" fill="#EDF3F9"/>')

# расчистка и уборка участка: грабли, мешки, костёр листвы
d, s = sky('#A9D3EE', '#F6E9D2')
d2, g = ground(430, '#8DBE6B', '#4C8A4A')
leaves = ''.join(f'<ellipse cx="{random.randint(10,390)}" cy="{random.randint(450,590)}" rx="9" ry="5" fill="{random.choice(["#D97706","#B45309","#EAB308","#C2410C"])}" transform="rotate({random.randint(0,180)} 200 500)"/>' for _ in range(40))
rake = '<g stroke="#8B5A2B" stroke-width="8" stroke-linecap="round"><line x1="120" y1="250" x2="230" y2="520"/></g><g stroke="#6B7280" stroke-width="5"><line x1="190" y1="500" x2="285" y2="540"/><line x1="200" y1="508" x2="215" y2="556"/><line x1="214" y1="512" x2="236" y2="560"/><line x1="228" y1="516" x2="258" y2="558"/><line x1="242" y1="520" x2="280" y2="556"/><line x1="256" y1="526" x2="306" y2="550"/></g>'
bags2 = '<g><ellipse cx="320" cy="470" rx="42" ry="48" fill="#15803D"/><ellipse cx="365" cy="490" rx="32" ry="38" fill="#166534"/><path d="M312 424 q8-14 16 0" stroke="#14532D" stroke-width="5" fill="none"/></g>'
scenes['uborka-uchastka'] = (d + d2, s + sun(70, 100, 38) + cloud(290, 90) + g + tree(60, 330, 1.1, '#B45309') + tree(350, 350, .9, '#CA8A04') + leaves + rake + bags2)

# спил деревьев: дерево, бензопила, брёвна
d, s = sky('#9BCBEA', '#F7EAD3')
d2, g = ground(470, '#79B86B', '#3D7F4B')
logs = ''.join(f'<g><rect x="{x}" y="{y}" width="120" height="34" rx="17" fill="#B8793B"/><circle cx="{x+16}" cy="{y+17}" r="14" fill="#E3B27A"/><circle cx="{x+16}" cy="{y+17}" r="6" fill="#C98F52"/></g>' for x, y in ((220, 500), (240, 536), (200, 468)))
saw = '<g><rect x="60" y="440" width="110" height="46" rx="10" fill="#F97316"/><rect x="168" y="452" width="120" height="14" rx="4" fill="#9CA3AF"/><g stroke="#4B5563" stroke-width="3">' + ''.join(f'<line x1="{x}" y1="452" x2="{x}" y2="446"/>' for x in range(176, 286, 10)) + '</g><rect x="76" y="426" width="50" height="20" rx="6" fill="#1F2937"/></g>'
scenes['spil-derevev'] = (d + d2, s + sun(330, 100, 36) + cloud(90, 100) + g +
    '<rect x="150" y="260" width="60" height="215" fill="#7B4F2A"/><path d="M150 475 q-24 8 -40 -6 q20 -2 40 -18Z M210 475 q24 8 40 -6 q-20 -2 -40 -18Z" fill="#7B4F2A"/>' +
    '<circle cx="180" cy="210" r="90" fill="#2F855A"/><circle cx="110" cy="260" r="62" fill="#38A169"/><circle cx="256" cy="256" r="64" fill="#2F855A"/><circle cx="180" cy="150" r="56" fill="#48BB78"/>' +
    logs + saw)

for slug, (defs, body) in scenes.items():
    with open(os.path.join(OUT, f'{slug}.svg'), 'w', encoding='utf-8') as f:
        f.write(svg(body, defs))
    print('ok', slug)
