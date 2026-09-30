/* Извлекает геометрию выбранных деталей dungeon-кита (GLB) в компактный
 * data/dungeonMeshes.ts: base64 буферы POSITION/NORMAL/TEXCOORD_0 + индексы,
 * плюс единый атлас colormap.png как data-URL. Грузится в мир без GLTFLoader
 * и без сети (offline), работает с инлайн-UMD THREE. */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Models', 'GLB format');
const PIECES = [
  'template-floor', 'template-wall', 'template-wall-corner',
  'template-wall-half', 'gate-door',
  'corridor', 'corridor-end',
];

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function parseGlb(file) {
  const b = fs.readFileSync(file);
  const clen = b.readUInt32LE(12);
  const json = JSON.parse(b.toString('utf8', 20, 20 + clen));
  const binStart = 28 + clen; // header12 + chunk0hdr8 + clen + chunk1hdr8
  const bin = b.subarray(binStart);
  return { json, bin };
}

function readAccessor(json, bin, idx) {
  const acc = json.accessors[idx];
  const bv = json.bufferViews[acc.bufferView];
  const TA = CT[acc.componentType];
  const comps = NC[acc.type];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || comps * TA.BYTES_PER_ELEMENT;
  const out = new (acc.componentType === 5126 ? Float32Array : (acc.componentType === 5125 ? Uint32Array : Float64Array))(acc.count * comps);
  // читаем поэлементно (учёт byteStride, на случай интерливинга)
  for (let i = 0; i < acc.count; i++) {
    const o = base + i * stride;
    const view = new TA(bin.buffer, bin.byteOffset + o, comps);
    for (let c = 0; c < comps; c++) out[i * comps + c] = view[c];
  }
  return { out, comps, count: acc.count };
}

function b64(typedArr) {
  return Buffer.from(typedArr.buffer, typedArr.byteOffset, typedArr.byteLength).toString('base64');
}

const meshes = {};
for (const name of PIECES) {
  const file = path.join(DIR, name + '.glb');
  if (!fs.existsSync(file)) { console.warn('skip missing', name); continue; }
  const { json, bin } = parseGlb(file);
  const prim = json.meshes[0].primitives[0];
  const pos = readAccessor(json, bin, prim.attributes.POSITION);
  const nor = readAccessor(json, bin, prim.attributes.NORMAL);
  const uv = readAccessor(json, bin, prim.attributes.TEXCOORD_0);
  const idxA = readAccessor(json, bin, prim.indices);
  // bbox
  const p = pos.out; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); }
  const f32 = (a) => Float32Array.from(a);
  const maxIdx = idxA.out.reduce((m, v) => Math.max(m, v), 0);
  const idx = maxIdx < 65536 ? Uint16Array.from(idxA.out) : Uint32Array.from(idxA.out);
  meshes[name] = {
    pos: b64(f32(pos.out)), nor: b64(f32(nor.out)), uv: b64(f32(uv.out)),
    idx: b64(idx), idxBits: maxIdx < 65536 ? 16 : 32,
    bbox: { min: mn.map((v) => +v.toFixed(3)), max: mx.map((v) => +v.toFixed(3)) },
  };
  console.log(name, 'verts', pos.count, 'tris', idxA.count / 3, 'bbox', JSON.stringify(meshes[name].bbox));
}

const tex = fs.readFileSync(path.join(DIR, 'Textures', 'colormap.png')).toString('base64');
const TEX_URL = 'data:image/png;base64,' + tex;

const header = '/* AUTO-GENERATED dungeon-кит (Kenney): геометрия деталей + атлас. Offline, без GLTFLoader. */\n/* eslint-disable */\n// @ts-nocheck\n';
let out = header;
out += 'export const DUNGEON_TEX: string = ' + JSON.stringify(TEX_URL) + ';\n';
out += 'export const DUNGEON_MESHES: any = ' + JSON.stringify(meshes) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'dungeonMeshes.ts'), out);
const bytes = Buffer.byteLength(out, 'utf8');
console.log('wrote data/dungeonMeshes.ts', (bytes / 1024).toFixed(1) + 'KB', 'tex', (tex.length / 1024).toFixed(1) + 'KB');
