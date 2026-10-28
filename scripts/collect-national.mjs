// Generated from muryoum backend. Source SHA-256: a4d15c588c290ade06fa32057c398959fba5bbad147a03837aab1ffca5101dde
// Rebuild with: node scripts/bundle-national.mjs

// scripts/collect-national.ts
import { mkdir, writeFile, readFile } from "node:fs/promises";

// src/model.ts
function textOnly(value) {
  const decoded = String(value ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&middot;/g, "\xB7").replace(/&bull;/g, "\u2022").replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, number) => {
    const n = number[0].toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number);
    return n > 0 && n <= 1114111 ? String.fromCodePoint(n) : "";
  });
  return decoded.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?\s*>|<\/(p|div|li|tr|h[1-6])>/gi, "\n").replace(/<\/?[a-z][a-z0-9]*(?:\s[^>]*)?\s*\/?\s*>/gi, "").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 18e3);
}
async function digest(value) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(data), (b) => b.toString(16).padStart(2, "0")).join("");
}

// src/discovery.ts
function categoryGroup(category, title) {
  const text = `${category} ${title}`;
  const rules = [
    ["\uB514\uC9C0\uD138\xB7IT", /정보통신|컴퓨터|스마트폰|코딩|인공지능|디지털|엑셀|파이썬|\bAI\b/i],
    ["\uCDE8\uC5C5\xB7\uC790\uACA9", /전문\/자격증|자격증|취업|창업|직무|직업|이력서/],
    ["\uC5B8\uC5B4", /영어|중국어|일본어|외국어|한국어|회화|어학/],
    ["\uC6B4\uB3D9\xB7\uAC74\uAC15", /스포츠|운동|건강|요가|필라테스|댄스|수영|체조|탁구|배드민턴|태권도/],
    ["\uC790\uC5F0\xB7\uACFC\uD559", /자연\/과학|도시농업|생태|환경|텃밭|원예|과학|천문|곤충|식물|숲/],
    ["\uBB38\uD654\xB7\uC608\uC220", /미술|음악|예술|그림|드로잉|수채화|서예|캘리|사진|악기|우쿨렐레|오카리나|합창/],
    ["\uC0DD\uD65C\xB7\uCDE8\uBBF8", /공예|취미|요리|제과|제빵|바느질|뜨개|재봉|정리수납|생활/],
    ["\uC778\uBB38\xB7\uAD50\uC591", /역사|교양|인문|독서|철학|문학|글쓰기|시낭송|경제|시민/]
  ];
  return rules.find(([, r]) => r.test(category))?.[0] ?? rules.find(([, r]) => r.test(text))?.[0] ?? "\uAE30\uD0C0";
}
function audiences(target) {
  const out = [];
  if (/유아|유치|어린이|아동|초등|영아/.test(target)) out.push("\uC544\uB3D9");
  if (/청소년|중학생|고등학생|중고등/.test(target)) out.push("\uCCAD\uC18C\uB144");
  if (/성인|청년|직장인|학부모|부모|중장년|여성|남성/.test(target)) out.push("\uC131\uC778");
  if (/어르신|노인|시니어|고령/.test(target)) out.push("\uC5B4\uB974\uC2E0");
  if (/누구나|제한\s*없음|전\s*연령|전\s*세대|모든\s*시민/.test(target)) out.push("\uB204\uAD6C\uB098");
  if (!out.length && /일반|시민|주민/.test(target)) out.push("\uC131\uC778");
  return out.length ? out : ["\uB300\uC0C1 \uD655\uC778 \uD544\uC694"];
}
function validPoint(lon, lat) {
  if (lon == null || lat == null || String(lon).trim() === "" || String(lat).trim() === "") return null;
  const x = Number(lon), y = Number(lat);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 124 && x <= 132 && y >= 33 && y <= 39.5 ? { longitude: x, latitude: y } : null;
}
function childSuitable(target, title, description) {
  return audiences(target).some((a) => ["\uC544\uB3D9", "\uCCAD\uC18C\uB144", "\uB204\uAD6C\uB098"].includes(a)) && !/성인\s*전용|19\s*세\s*이상|주류|와인|전통주|맥주|칵테일|양조|도박|성인용/.test(`${target} ${title} ${description}`);
}
var REGION_ALIASES = { \uC11C\uC6B8: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", \uACBD\uAE30: "\uACBD\uAE30\uB3C4", \uC778\uCC9C: "\uC778\uCC9C\uAD11\uC5ED\uC2DC", \uBD80\uC0B0: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC", \uB300\uAD6C: "\uB300\uAD6C\uAD11\uC5ED\uC2DC", \uB300\uC804: "\uB300\uC804\uAD11\uC5ED\uC2DC", \uC6B8\uC0B0: "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC", \uAD11\uC8FC: "\uAD11\uC8FC\uAD11\uC5ED\uC2DC", \uC138\uC885: "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC", \uAC15\uC6D0: "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4", \uAC15\uC6D0\uB3C4: "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4", \uCDA9\uBD81: "\uCDA9\uCCAD\uBD81\uB3C4", \uCDA9\uB0A8: "\uCDA9\uCCAD\uB0A8\uB3C4", \uC804\uBD81: "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4", \uC804\uB77C\uBD81\uB3C4: "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4", \uC804\uB0A8: "\uC804\uB77C\uB0A8\uB3C4", \uACBD\uBD81: "\uACBD\uC0C1\uBD81\uB3C4", \uACBD\uB0A8: "\uACBD\uC0C1\uB0A8\uB3C4", \uC81C\uC8FC: "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4" };
var NATIONAL_SOURCE = "https://www.data.go.kr/data/15013110/standard.do";
function dateOnly(v) {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = /* @__PURE__ */ new Date(`${s}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}
async function normalizeNational(r, now2) {
  const s = (k) => textOnly(r[k]);
  const title = s("LCTRE_NM"), institution = s("OPER_INSTITUTION_NM"), address = s("EDC_RDNMADR").replace(/\s+/g, " ");
  const end = dateOnly(r.EDC_END_DAY), start = dateOnly(r.EDC_START_DAY), reference = dateOnly(r.REFERENCE_DATE);
  const today = new Date(Date.parse(now2) + 9 * 36e5).toISOString().slice(0, 10);
  if (!title || !institution || !address || !start || !end || start > end || end < today || !reference || reference > today || Date.parse(today) - Date.parse(reference) > 180 * 864e5) return null;
  if (/시설\s*대관|무료\s*상담|개별\s*상담/.test(title)) return null;
  const parts = address.split(" "), region = REGION_ALIASES[parts[0]] ?? parts[0];
  if (!/^(서울특별시|경기도|인천광역시|부산광역시|대구광역시|대전광역시|울산광역시|광주광역시|세종특별자치시|강원특별자치도|충청[남북]도|전라남도|전북특별자치도|경상[남북]도|제주특별자치도|전남광주통합특별시)$/.test(region)) return null;
  const identity = [s("INSTT_CODE"), institution, title, start, end, s("OPER_DAY"), s("EDC_START_TIME"), s("EDC_COLSE_TIME"), address, s("EDC_PLACE")];
  const sourceId = (await digest(JSON.stringify(identity))).slice(0, 32);
  const receiptStart = dateOnly(r.RCEPT_START_DATE), receiptEnd = dateOnly(r.RCEPT_END_DATE);
  const receptionWindows = receiptStart && receiptEnd && receiptStart <= receiptEnd ? [{ id: "main", start: `${receiptStart}T00:00:00+09:00`, end: new Date(Date.parse(`${receiptEnd}T00:00:00+09:00`) + 864e5).toISOString(), method: "unknown", verified: false, startVerified: false, endVerified: false }] : [];
  receptionWindows.forEach((w) => {
    w.start = new Date(w.start).toISOString();
  });
  const closed = !!receptionWindows.length && receptionWindows[0].end <= now2;
  const cost = s("LCTRE_COST"), amount = /^\d+(?:\.0+)?$/.test(cost) ? Number(cost) : null;
  const target = s("EDC_TRGET_TYPE"), description = s("LCTRE_CO");
  const course = {
    id: `national:${sourceId}`,
    provider: "national-lifelong",
    sourceId,
    canonicalUrl: NATIONAL_SOURCE,
    schemaVersion: 3,
    contentRevision: "",
    scopeId: `national:${region}`,
    region,
    district: parts[1] ?? region,
    address,
    title,
    category: "",
    categoryGroup: categoryGroup("", title),
    place: s("EDC_PLACE") || institution,
    targetText: target,
    eligibilityText: target,
    eligibilityVerified: false,
    minAge: null,
    maxAge: null,
    classStart: (/* @__PURE__ */ new Date(`${start}T00:00:00+09:00`)).toISOString(),
    classEnd: (/* @__PURE__ */ new Date(`${end}T00:00:00+09:00`)).toISOString(),
    classSessions: [],
    attendanceRequirement: "unknown",
    receptionWindows,
    tuition: amount === 0 ? "free" : amount !== null ? "paid" : "unknown",
    extraFees: "\uC7AC\uB8CC\uBE44\xB7\uAD50\uC7AC\uBE44 \uB4F1 \uCD94\uAC00 \uBE44\uC6A9\uC740 \uAE30\uAD00\uC5D0 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
    sourceStatus: "\uD604\uC7AC \uBAA8\uC9D1 \uC0C1\uD0DC \uD655\uC778 \uD544\uC694",
    derivedStatus: closed ? "closed" : "unknown",
    sourceAvailability: "unknown",
    evidenceState: "unknown",
    description: [description, `\uC6B4\uC601\uAE30\uAD00: ${institution}`, `\uC6B4\uC601 \uC694\uC77C: ${s("OPER_DAY") || "\uD655\uC778 \uD544\uC694"}`, `\uAD50\uC721 \uC2DC\uAC04: ${s("EDC_START_TIME")} ~ ${s("EDC_COLSE_TIME")}`, `\uBB38\uC758: ${s("OPER_PHONE_NUMBER")}`].join("\n"),
    fieldEvidence: [{ field: "identity", source: "15013110", note: JSON.stringify(identity) }, { field: "source", source: NATIONAL_SOURCE, note: `\uC81C\uACF5\uAE30\uAD00 ${s("INSTT_NM")} \xB7 \uAE30\uC900\uC77C ${reference}` }],
    qualityFlags: ["RECEPTION_TIME_REQUIRES_REVIEW", "ELIGIBILITY_REQUIRES_REVIEW", "LOCATION_UNVERIFIED"],
    fetchedAt: now2,
    sourceUpdatedAt: `${reference}T00:00:00+09:00`,
    verifiedAt: null,
    sourceContentHash: await digest(JSON.stringify(r)),
    latitude: null,
    longitude: null,
    locationEvidence: "unknown",
    audiences: audiences(target),
    linkKind: "source",
    sourceLabel: "\uC804\uAD6D\uD3C9\uC0DD\uD559\uC2B5\uAC15\uC88C\uD45C\uC900\uB370\uC774\uD130",
    delivery: /온라인|모바일|우편|원격/.test(s("EDC_MTH_TYPE")) ? "online" : /혼합/.test(s("EDC_MTH_TYPE")) ? "hybrid" : "offline",
    childSuitable: childSuitable(target, title, description),
    applicationMethod: s("RCEPT_MTH_TYPE"),
    costDetails: { tuitionAmount: amount, currency: "KRW", unit: "unknown", mandatoryExtras: "unknown", optionalExtras: "unknown", totalKnownCost: null }
  };
  try {
    const u = new URL(/^https?:/.test(s("HOMEPAGE_URL")) ? s("HOMEPAGE_URL") : `https://${s("HOMEPAGE_URL")}`);
    if (u.protocol === "https:" && !u.username && !u.password && !u.port && (/\.(go|ac)\.kr$/.test(u.hostname) || u.hostname.endsWith(".sen.go.kr") || u.hostname === "www.gbelib.kr")) {
      course.canonicalUrl = u.toString();
      course.linkKind = "institution";
    }
  } catch {
  }
  course.contentRevision = (await digest(JSON.stringify(course))).slice(0, 20);
  return course;
}

// src/locations.ts
var compact = (v) => String(v ?? "").normalize("NFKC").replace(/\s+/g, "").replace(/경기도?/g, "\uACBD\uAE30\uB3C4").replace(/서울특별시/g, "\uC11C\uC6B8").replace(/강원특별자치도|강원도/g, "\uAC15\uC6D0").replace(/전북특별자치도|전라북도/g, "\uC804\uBD81");
function matchLibrary(c, rows2) {
  if (c.delivery === "online") return c;
  const institution = c.description.split("\n").find((x) => x.startsWith("\uC6B4\uC601\uAE30\uAD00: "))?.slice(6) ?? "";
  const candidates = rows2.filter((r) => compact(r.RDNMADR) === compact(c.address) && (compact(institution).includes(compact(r.LBRRY_NM)) || compact(c.place).includes(compact(r.LBRRY_NM))) && String(r.LBRRY_NM ?? "").length >= 3 && validPoint(r.LONGITUDE, r.LATITUDE));
  const points = [...new Set(candidates.map((r) => `${Number(r.LONGITUDE)},${Number(r.LATITUDE)}`))];
  if (points.length !== 1) return c;
  const row = candidates[0], point = validPoint(row.LONGITUDE, row.LATITUDE);
  return { ...c, ...point, locationEvidence: "data.go.kr:15013109:exact-address-and-library", qualityFlags: c.qualityFlags.filter((x) => x !== "LOCATION_UNVERIFIED"), fieldEvidence: [...c.fieldEvidence, { field: "location", source: "https://www.data.go.kr/data/15013109/standard.do", note: `${row.LBRRY_NM} \xB7 ${row.RDNMADR} \xB7 \uAE30\uC900\uC77C ${row.REFERENCE_DATE}` }] };
}

// scripts/collect-national.ts
var now = (/* @__PURE__ */ new Date()).toISOString();
var rows = [];
if (process.env.NATIONAL_INPUT) rows = JSON.parse(await readFile(process.env.NATIONAL_INPUT, "utf8")).rows;
else {
  const origin = "https://www.data.go.kr";
  const get = async (url) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(9e4) });
    if (!r.ok) throw Error(`SOURCE_HTTP_${r.status}`);
    return r.json();
  };
  const header = await get(`${origin}/download/columList.json?pk=15013110&ext=JSON`);
  if (!Number.isInteger(header.totalCount) || header.totalCount < 1 || header.totalCount > 1e5 || header.tableVO.svcTableNm !== "tn_pubr_public_lftm_lrn_lctre_svc") throw Error("SOURCE_CONTRACT_CHANGED");
  for (let page = 1; page <= Math.ceil(header.totalCount / 1e4); page++) {
    const q = new URLSearchParams({ publicDataPk: "15013110", totalCount: String(header.totalCount), svcTableNm: header.tableVO.svcTableNm, perPage: "10000", page: String(page) });
    for (const col of header.tableVO.colNmList) q.append("colNmList", col);
    const part = await get(`${origin}/download/standard.json?${q}`);
    if (!Array.isArray(part)) throw Error("INVALID_SOURCE_PAGE");
    rows.push(...part);
  }
  if (rows.length !== header.totalCount) throw Error("INCOMPLETE_SOURCE");
}
var libraryHeader = await (await fetch("https://www.data.go.kr/download/columList.json?pk=15013109&ext=JSON", { signal: AbortSignal.timeout(3e4) })).json();
if (!Number.isInteger(libraryHeader.totalCount) || libraryHeader.totalCount > 1e4 || libraryHeader.tableVO.svcTableNm !== "tn_pubr_public_lbrry_svc") throw Error("LIBRARY_CONTRACT_CHANGED");
var lq = new URLSearchParams({ publicDataPk: "15013109", totalCount: String(libraryHeader.totalCount), svcTableNm: libraryHeader.tableVO.svcTableNm, perPage: "10000", page: "1" });
for (const col of libraryHeader.tableVO.colNmList) lq.append("colNmList", col);
var libraries = await (await fetch(`https://www.data.go.kr/download/standard.json?${lq}`, { signal: AbortSignal.timeout(6e4) })).json();
if (!Array.isArray(libraries) || libraries.length !== libraryHeader.totalCount) throw Error("INCOMPLETE_LIBRARY_SOURCE");
var byId = /* @__PURE__ */ new Map();
for (const row of rows) {
  const c = await normalizeNational(row, now);
  if (c) {
    const prev = byId.get(c.id);
    if (!prev || String(c.sourceUpdatedAt) > String(prev.sourceUpdatedAt)) byId.set(c.id, c);
  }
}
var courses = [...byId.values()].map((c) => matchLibrary(c, libraries)).sort((a, b) => a.id.localeCompare(b.id));
for (const c of courses) c.contentRevision = (await digest(JSON.stringify({ ...c, contentRevision: "" }))).slice(0, 20);
if (!courses.length) throw Error("EMPTY_VALIDATED_CATALOG");
var revision = (await digest(JSON.stringify(courses))).slice(0, 20);
var regionCounts = /* @__PURE__ */ new Map();
for (const c of courses) regionCounts.set(c.region, (regionCounts.get(c.region) ?? 0) + 1);
var report = { checkedAt: now, sourceRows: rows.length, courses: courses.length, revision, regions: [...regionCounts].map(([region, count]) => ({ region, count })), free: courses.filter((c) => c.tuition === "free").length, mapped: courses.filter((c) => c.latitude !== null).length };
var output = process.env.MURYOUM_REPORT_DIR ?? "../artifacts/map-20261028";
await mkdir(output, { recursive: true });
await writeFile(`${output}/national-audit.json`, JSON.stringify(report, null, 2));
await writeFile(`${output}/national-normalized.json`, JSON.stringify(courses));
console.log(JSON.stringify(report));
if (process.env.MURYOUM_ADMIN_TOKEN) {
  const origin = process.env.MURYOUM_API_BASE ?? "https://muryoum.choimaest.workers.dev";
  if (origin !== "https://muryoum.choimaest.workers.dev") throw Error("INVALID_API_BASE");
  const post = async (body) => {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${origin}/internal/v3/import`, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MURYOUM_ADMIN_TOKEN}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(6e4) });
      if (r.ok) {
        result = await r.json();
        return result;
      }
      if (r.status < 500) throw Error(`IMPORT_HTTP_${r.status}`);
    }
    throw Error("IMPORT_FAILED");
  };
  for (let i = 0; i < courses.length; i += 30) {
    const batch = courses.slice(i, i + 30);
    const result = await post({ scope: "national:all", revision, courses: batch });
    if (result.status !== "staged" || result.count !== batch.length) throw Error("STAGING_NOT_CONFIRMED");
  }
  const published = await post({ scope: "national:all", revision, count: courses.length, action: "publish" });
  if (published.status !== "published" || published.count !== courses.length || published.revision !== revision) throw Error("PUBLICATION_NOT_CONFIRMED");
  console.log(JSON.stringify(published));
}
