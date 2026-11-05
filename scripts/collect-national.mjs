// Generated from muryoum backend. Source SHA-256: 64a6c74b3fa05db6479efff1f88ccbebe418ed9fcf3ab37941043e15cd09ae8f
// Rebuild with: node scripts/bundle-national.mjs

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
async function normalizeNational(r, now) {
  const s = (k) => textOnly(r[k]);
  const title = s("LCTRE_NM"), institution = s("OPER_INSTITUTION_NM"), address = s("EDC_RDNMADR").replace(/\s+/g, " ");
  const end = dateOnly(r.EDC_END_DAY), start = dateOnly(r.EDC_START_DAY), reference = dateOnly(r.REFERENCE_DATE);
  const today = new Date(Date.parse(now) + 9 * 36e5).toISOString().slice(0, 10);
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
  const closed = !!receptionWindows.length && receptionWindows[0].end <= now;
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
    fetchedAt: now,
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
function matchLibrary(c, rows) {
  if (c.delivery === "online") return c;
  const institution = c.description.split("\n").find((x) => x.startsWith("\uC6B4\uC601\uAE30\uAD00: "))?.slice(6) ?? "";
  const candidates = rows.filter((r) => compact(r.RDNMADR) === compact(c.address) && (compact(institution).includes(compact(r.LBRRY_NM)) || compact(c.place).includes(compact(r.LBRRY_NM))) && String(r.LBRRY_NM ?? "").length >= 3 && validPoint(r.LONGITUDE, r.LATITUDE));
  const points = [...new Set(candidates.map((r) => `${Number(r.LONGITUDE)},${Number(r.LATITUDE)}`))];
  if (points.length !== 1) return c;
  const row = candidates[0], point = validPoint(row.LONGITUDE, row.LATITUDE);
  return { ...c, ...point, locationEvidence: "data.go.kr:15013109:exact-address-and-library", qualityFlags: c.qualityFlags.filter((x) => x !== "LOCATION_UNVERIFIED"), fieldEvidence: [...c.fieldEvidence, { field: "location", source: "https://www.data.go.kr/data/15013109/standard.do", note: `${row.LBRRY_NM} \xB7 ${row.RDNMADR} \xB7 \uAE30\uC900\uC77C ${row.REFERENCE_DATE}` }] };
}

// src/collection-policy.ts
var LIST_FRESHNESS_MS = 8 * 36e5;
var DETAIL_FRESHNESS_MS = 6 * 36e5;
var volatile = /* @__PURE__ */ new Set(["contentRevision", "derivedStatus", "fetchedAt", "verifiedAt", "checkedAt", "publishedAt", "detailCheckedAt"]);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !volatile.has(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  return value;
}
var contentHash = async (value) => (await digest(JSON.stringify(stable(value)))).slice(0, 20);

// scripts/national-collector.ts
var ORIGIN = "https://www.data.go.kr";
var API = "https://muryoum.choimaest.workers.dev";
function fullCheckDue(kind, state, now) {
  if (!state?.fullCheckedAt) return true;
  const kst = new Date(Date.parse(now) + 9 * 36e5), previous = new Date(Date.parse(state.fullCheckedAt) + 9 * 36e5);
  const scheduled = kst.getUTCDay() === 1 && (kind === "national" || kst.getUTCDate() <= 7);
  return scheduled && kst.toISOString().slice(0, 10) !== previous.toISOString().slice(0, 10) || Date.parse(now) - Date.parse(state.fullCheckedAt) >= (kind === "national" ? 7 : 35) * 864e5;
}
async function collectNational({ token, mode = "national", force = false, fetcher = fetch, now = (/* @__PURE__ */ new Date()).toISOString(), emit = console.log }) {
  if (!token || !["national", "library"].includes(mode)) throw Error("CONFIGURATION_INCOMPLETE");
  const usage = { sourceRequests: 0, workerRequests: 0, d1RowsRead: 0, d1RowsWritten: 0, kvReads: 0, kvWrites: 0, kvDeletes: 0, kvLists: 0 };
  const json = async (url, body) => {
    const internal = url.startsWith(API + "/internal/");
    usage[internal ? "workerRequests" : "sourceRequests"]++;
    const r = await fetcher(url, { method: body === void 0 ? "GET" : "POST", redirect: "error", signal: AbortSignal.timeout(9e4), headers: { Accept: "application/json", "User-Agent": "muryoum-operations/2.0", ...internal ? { Authorization: "Bearer " + token } : {}, ...body === void 0 ? {} : { "Content-Type": "application/json" } }, ...body === void 0 ? {} : { body: JSON.stringify(body) } });
    if (!r.ok) throw Error(`${internal ? "WORKER" : "SOURCE"}_HTTP_${r.status}`);
    let d;
    try {
      d = await r.json();
    } catch {
      throw Error(internal ? "WORKER_INVALID_RESPONSE" : "SOURCE_MAINTENANCE");
    }
    if (internal && d.usage) {
      for (const k of Object.keys(usage)) if (k !== "workerRequests" && typeof d.usage[k] === "number") usage[k] += d.usage[k];
    }
    return d;
  };
  const report = (value) => {
    const result = { checkedAt: now, mode, ...value, usage };
    emit(JSON.stringify(result));
    return result;
  };
  const getHeader = async (pk) => {
    const [meta, header2] = await Promise.all([json(`${ORIGIN}/catalog/${pk}/standard.json`), json(`${ORIGIN}/download/columList.json?pk=${pk}&ext=JSON`)]);
    const table = pk === "15013110" ? "tn_pubr_public_lftm_lrn_lctre_svc" : "tn_pubr_public_lbrry_svc";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.dateModified ?? "") || !Number.isInteger(header2.totalCount) || header2.totalCount < 1 || header2.totalCount > (pk === "15013110" ? 1e5 : 1e4) || header2.tableVO?.svcTableNm !== table || !Array.isArray(header2.tableVO?.colNmList)) throw Error("SOURCE_CONTRACT_CHANGED");
    return { header: header2, fingerprint: await contentHash({ modified: meta.dateModified, count: header2.totalCount, columns: header2.tableVO.colNmList, table }) };
  };
  const download = async (pk, header2) => {
    const rows2 = [];
    for (let page = 1; page <= Math.ceil(header2.totalCount / 1e4); page++) {
      const q = new URLSearchParams({ publicDataPk: pk, totalCount: String(header2.totalCount), svcTableNm: header2.tableVO.svcTableNm, perPage: "10000", page: String(page) });
      for (const c of header2.tableVO.colNmList) q.append("colNmList", c);
      const part = await json(`${ORIGIN}/download/standard.json?${q}`);
      if (!Array.isArray(part) || part.some((x) => !x || typeof x !== "object")) throw Error("INVALID_SOURCE_PAGE");
      rows2.push(...part);
    }
    if (rows2.length !== header2.totalCount) throw Error("INCOMPLETE_SOURCE");
    return rows2;
  };
  const saved = await json(API + "/internal/collection-state");
  let library = saved.library ?? null;
  if (mode === "library" || !library) {
    const { header: header2, fingerprint: fingerprint2 } = await getHeader("15013109");
    if (force || !library || library.fingerprint !== fingerprint2 || fullCheckDue("library", library, now)) {
      if (saved.budget?.deferOptional !== false) return report({ status: "deferred", code: "QUOTA_DEFERRED", budgetLevel: saved.budget?.level ?? "unknown" });
      const raw = await download("15013109", header2);
      const rows2 = raw.map((r) => Object.fromEntries(["LBRRY_NM", "RDNMADR", "LONGITUDE", "LATITUDE", "REFERENCE_DATE"].map((k) => [k, String(r[k] ?? "")])));
      library = { fingerprint: fingerprint2, sourceRows: rows2.length, metadataCheckedAt: now, fullCheckedAt: now, revision: await contentHash(rows2), rows: rows2 };
      const response = await json(API + "/internal/collection-state", { kind: "library", state: library, rows: rows2 });
      if (response.status !== "saved") throw Error("LIBRARY_SAVE_FAILED");
    } else {
      library = { ...library, metadataCheckedAt: now };
      const response = await json(API + "/internal/collection-state", { kind: "library", state: library, rows: library.rows });
      if (response.status !== "saved") throw Error("LIBRARY_SAVE_FAILED");
    }
    if (mode === "library") return report({ status: "checked", sourceRows: library.sourceRows, revision: library.revision });
  }
  const previous = saved.national ?? null;
  const { header, fingerprint } = await getHeader("15013110");
  const next = { ...previous, fingerprint, sourceRows: header.totalCount, metadataCheckedAt: now };
  const changed = !previous || previous.fingerprint !== fingerprint || previous.libraryRevision !== library.revision;
  if (!force && !changed && !fullCheckDue("national", previous, now)) {
    await json(API + "/internal/collection-state", { kind: "national", state: next });
    await json(API + "/internal/maintenance", {});
    return report({ status: "metadata_unchanged", fullCheckedAt: previous?.fullCheckedAt, courseRowsWritten: 0 });
  }
  if (saved.budget?.deferOptional !== false) return report({ status: "deferred", code: "QUOTA_DEFERRED", budgetLevel: saved.budget?.level ?? "unknown" });
  const rows = await download("15013110", header), byId = /* @__PURE__ */ new Map();
  const sourceContentHash = await contentHash(rows);
  if (previous?.sourceContentHash === sourceContentHash && previous.libraryRevision === library.revision && previous.revision === saved.active?.revision) {
    const checked2 = await json(API + "/internal/v3/import", { scope: "national:all", revision: previous.revision, count: saved.active.course_count, action: "check" });
    if (checked2.status === "unchanged") {
      await json(API + "/internal/collection-state", { kind: "national", state: { ...next, fullCheckedAt: now } });
      await json(API + "/internal/maintenance", {});
      return report({ status: "unchanged", sourceRows: rows.length, courses: saved.active.course_count, revision: previous.revision, courseRowsWritten: 0 });
    }
  }
  for (const row of rows) {
    const c = await normalizeNational(row, now);
    if (c) {
      const old = byId.get(c.id);
      if (!old || String(c.sourceUpdatedAt) > String(old.sourceUpdatedAt)) byId.set(c.id, c);
    }
  }
  const courses = [...byId.values()].map((c) => matchLibrary(c, library.rows)).sort((a, b) => a.id.localeCompare(b.id));
  for (const c of courses) c.contentRevision = await contentHash(c);
  if (!courses.length) throw Error("EMPTY_VALIDATED_CATALOG");
  const revision = await contentHash(courses), base = { scope: "national:all", revision, count: courses.length };
  const checked = await json(API + "/internal/v3/import", { ...base, action: "check" });
  let published = checked;
  if (checked.status !== "unchanged") {
    for (let i = 0; i < courses.length; i += 30) {
      const part = courses.slice(i, i + 30), staged = await json(API + "/internal/v3/import", { scope: base.scope, revision, courses: part });
      if (staged.status === "deferred") return report({ status: "deferred", code: "QUOTA_DEFERRED" });
      if (staged.status !== "staged" || staged.count !== part.length) throw Error("STAGING_NOT_CONFIRMED");
    }
    published = await json(API + "/internal/v3/import", { ...base, action: "publish" });
    if (published.status === "deferred") return report({ status: "deferred", code: "QUOTA_DEFERRED" });
    if (published.status !== "published" || published.revision !== revision || published.count !== courses.length) throw Error("PUBLICATION_NOT_CONFIRMED");
  }
  await json(API + "/internal/collection-state", { kind: "national", state: { ...next, revision, sourceContentHash, libraryRevision: library.revision, fullCheckedAt: now } });
  await json(API + "/internal/maintenance", {});
  return report({ status: published.status, sourceRows: rows.length, courses: courses.length, revision, courseRowsWritten: published.status === "unchanged" ? 0 : courses.length });
}

// scripts/collect-national.ts
import { mkdir, writeFile } from "node:fs/promises";
try {
  const report = await collectNational({ token: process.env.MURYOUM_ADMIN_TOKEN ?? "", mode: process.env.MURYOUM_SOURCE_MODE ?? "national", force: process.env.MURYOUM_FORCE_FULL === "true" });
  const output = process.env.MURYOUM_REPORT_DIR ?? "../artifacts/collection-20261105";
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/national-audit.json`, JSON.stringify(report, null, 2));
} catch (error) {
  const code = error instanceof Error && /^(?:SOURCE|WORKER)_HTTP_\d{3}$|^(?:SOURCE_CONTRACT_CHANGED|SOURCE_MAINTENANCE|INVALID_SOURCE_PAGE|INCOMPLETE_SOURCE|LIBRARY_SAVE_FAILED|EMPTY_VALIDATED_CATALOG|STAGING_NOT_CONFIRMED|PUBLICATION_NOT_CONFIRMED|CONFIGURATION_INCOMPLETE)$/.test(error.message) ? error.message : "COLLECTION_FAILED";
  console.error(JSON.stringify({ status: "error", code }));
  process.exitCode = 1;
}
