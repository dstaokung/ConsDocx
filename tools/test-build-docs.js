// ทดสอบสร้างเอกสารทุกฉบับด้วยฟังก์ชันจริงใน forms/main.html (รันใน Node โดย stub DOM แบบง่ายๆ)
// เช็คว่าไม่มี placeholder ค้างในไฟล์ที่สร้างออกมา — รันหลังเพิ่ม/แก้เทมเพลตหรือแก้ buildDocN()
//   node tools/test-build-docs.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.dirname(__dirname);

const VALUES = {
  projectName: "โครงการทดสอบถนน คสล. สายทดสอบ",
  g_projectDetail: "กว้าง 5 ม. ยาว 300 ม.",
  // ตั้งใจใช้เดือน/ปีที่ไม่ตรงกับข้อความคงที่ในเทมเพลตฉบับไหนเลย เพื่อพิสูจน์ว่าค่ามาจากฟอร์มจริง
  g_month: "กันยายน", g_year: "2570",
  g_moneyNum: "2256000",
  g_letter3No: "111", g_letter3Date: "1/8/2569",
  g_rcOrderNo: "77",
  g_rc1name: "ว่าที่ ร.ต.คมสรร  เครือศรี", g_rc1pos: "ผู้อำนวยการกองช่าง",
  g_rc2name: "นายถิรพงศ์  พระใหญ่", g_rc2pos: "วิศวกรโยธาปฏิบัติการ",
  g_rc3name: "นายวิเชษฐ์  สุพัฒศร", g_rc3pos: "นายช่างโยธาปฏิบัติงาน",
  // งานราคากลาง — เลือกวิธีทับเป็น "เฉพาะเจาะจง" เพื่อทดสอบชุด building/specific (งบ 2.2 ล้านปกติจะได้ e-GP)
  g_rcWorkCat: "building", g_procMethod: "specific",
  g_rcPrice: "2100000",
  g_rcRecName: "นายวิเชษฐ์  สุพัฒศร", g_rcRecPos: "นายช่างโยธาปฏิบัติงาน",
  g_rcMeetStart: "10.00", g_rcMeetEnd: "11.00",
  g_rcMatMonth: "กรกฎาคม", g_rcMatYear: "2570",   // เดือน/ปีราคาวัสดุ (คนละตัวกับเดือน/ปีที่ออกเอกสาร)
};
const RC_SET = "building/specific";

function makeEl(id) {
  return {
    id, value: VALUES[id] !== undefined ? VALUES[id] : "",
    textContent: "", innerHTML: "", className: "", disabled: false,
    style: {}, dataset: {}, options: [], classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {}, remove() {}, insertBefore() {},
    querySelectorAll: () => [], querySelector: () => null, appendChildren() {},
    setAttribute() {}, getAttribute: () => null, focus() {}, select() {},
    append() {}, prepend() {}, replaceChildren() {}, removeChild() {}, closest: () => null,
    children: [], parentNode: null, firstChild: null, checked: false, title: "", type: "",
  };
}
const els = new Map();
const document = {
  getElementById: (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  querySelectorAll: () => [], querySelector: () => null,
  createElement: (t) => makeEl("__" + t),
  addEventListener() {}, body: makeEl("body"), documentElement: makeEl("html"),
};
const sandbox = {
  document, console, setTimeout, clearTimeout, Blob: function () {}, URL: { createObjectURL: () => "", revokeObjectURL() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: "node" }, alert() {}, confirm: () => true,
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  Uint8Array, ArrayBuffer, Promise, JSON, Math, Date, RegExp, Error, TextEncoder, TextDecoder,
  URLSearchParams, URL_: null, location: { search: "", href: "file:///main.html" }, history: { replaceState() {} },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function runFile(rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel }); }
runFile("shared/jszip.lib.js");
runFile("shared/monthyear.js");
runFile("forms/main-template-data.js");
runFile("forms/template-data/rc-index.js");
// ในเบราว์เซอร์ไฟล์นี้โหลดตอนกดสร้าง (แทรก <script src>) — ใน Node โหลดตรงๆ ให้ ensureRcSet() เจอเลย
runFile("forms/template-data/rc-" + RC_SET.replace("/", "-") + ".js");

const html = fs.readFileSync(path.join(ROOT, "forms/main.html"), "utf8");
const inline = html.slice(html.lastIndexOf("<script>") + "<script>".length, html.lastIndexOf("</script>"));
vm.runInContext(inline, sandbox, { filename: "main.html inline" });

// ช่อง select เดือน/ปี ถูก populate ทับด้วยเดือน/ปีปัจจุบันตอนสคริปต์หน้าเว็บรัน จึงต้องตั้งค่าหลังจากนั้น
["g_month", "g_year", "g_rcMatMonth", "g_rcMatYear"].forEach(id => {
  sandbox.document.getElementById(id).value = VALUES[id];
});

(async () => {
  const unzip = sandbox.JSZip;
  const DOC_INFO = vm.runInContext("DOC_INFO", sandbox); // const ใน vm ไม่โผล่บน global object
  const procMethodText = vm.runInContext("procMethodText", sandbox);
  let bad = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    const info = DOC_INFO[n];
    const bytes = await info.build(null, VALUES.projectName, VALUES.g_month, VALUES.g_year);
    const zip = await unzip.loadAsync(Buffer.from(bytes));
    const xml = await zip.file("word/document.xml").async("string");
    const text = xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
    const left = [...new Set(text.match(/\[[^\]\[]{1,60}\]/g) || [])];
    console.log(`เอกสาร ${n}: ${bytes.length} bytes | placeholder ค้าง: ${left.length ? left.join(", ") : "ไม่มี"}`);
    if (left.length) bad++;
    if (n === 6 || n === 7) {
      const want = n === 6
        ? [VALUES.projectName, VALUES.g_projectDetail, "111", "1 สิงหาคม 2569"]
        : [VALUES.projectName, "ที่ 77", VALUES.g_rc1name, VALUES.g_rc1pos, VALUES.g_rc3name, VALUES.g_rc3pos,
           `เดือน  ${VALUES.g_month}  พ.ศ.${VALUES.g_year}`,
           // วิธีจัดซื้อจัดจ้างมาจากฟอร์ม ไม่ได้ hardcode ในเทมเพลตแล้ว
           "โดย" + procMethodText()];
      want.forEach(s => {
        const hit = text.includes(s);
        if (!hit) bad++;
        console.log(`   ${hit ? "พบ  " : "ไม่พบ"} ${s}`);
      });
    }
  }

  // ---- เอกสารราคากลาง 8-11 ของชุดที่เลือก ----
  const buildRcDoc = vm.runInContext("buildRcDoc", sandbox);
  const rcInfo = sandbox.RC_INDEX[RC_SET];
  console.log(`\nชุดราคากลาง ${RC_SET} (${rcInfo.work} × ${rcInfo.method}) — ${rcInfo.docs.length} ฉบับ:`);
  for (const d of rcInfo.docs) {
    const { bytes, name } = await buildRcDoc(d.n, VALUES.projectName, VALUES.g_month, VALUES.g_year);
    const zip = await unzip.loadAsync(Buffer.from(bytes));
    const xml = await zip.file("word/document.xml").async("string");
    const text = xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
    const left = [...new Set(text.match(/\[[^\]\[]{1,60}\]/g) || [])];
    console.log(`   ${name}: ${bytes.length} bytes | placeholder ค้าง: ${left.length ? left.join(", ") : "ไม่มี"}`);
    if (left.length) bad++;
    if (d.n === 8) {
      // เอกสาร 8 เป็นฉบับเดียวในชุดที่พิมพ์ placeholder ไว้แล้ว จึงเช็คค่าที่แทนจริง
      [VALUES.projectName, VALUES.g_rcRecName, "10.00", "11.00", VALUES.g_rc1pos,
       "คือเดือนกรกฎาคม 2570",                       // ราคาวัสดุใช้เดือน/ปีของตัวเอง
       "เป็นเงินทั้งสิ้น 2,100,000",                   // ราคากลาง ไม่ใช่งบประมาณ (2,256,000)
       "โดยวิธีเฉพาะเจาะจง",                          // วิธีจัดซื้อจัดจ้างจากฟอร์ม
       "ในฐานะประธานกรรมการคณะกรรมการกำหนดราคากลาง"]
        .forEach(s => {
          const hit = text.includes(s);
          if (!hit) bad++;
          console.log(`      ${hit ? "พบ  " : "ไม่พบ"} ${s}`);
        });
    }
  }

  // เส้นแบ่งวิธีจัดซื้อจัดจ้างจากงบประมาณ (5 แสนพอดี = e-bidding, 1 ล้านพอดี = e-GP)
  const procMethodCode = vm.runInContext("procMethodCode", sandbox);
  const moneyEl = sandbox.document.getElementById("g_moneyNum");
  const pickEl = sandbox.document.getElementById("g_procMethod");
  pickEl.value = ""; // ล้างการเลือกทับก่อน จะได้ทดสอบกฎอัตโนมัติ
  const cases = [["499,999", "specific"], ["500000", "ebidding"], ["999,999", "ebidding"], ["1000000", "egp"], ["2,256,000", "egp"], ["", ""]];
  console.log("\nเส้นแบ่งวิธีจัดซื้อจัดจ้าง:");
  for (const [money, want] of cases) {
    moneyEl.value = money;
    const got = procMethodCode();
    if (got !== want) bad++;
    console.log(`   งบ ${money || "(ว่าง)"} → ${got || "(ว่าง)"} ${got === want ? "ถูก" : "ผิด คาดว่า " + want}`);
  }
  pickEl.value = "specific"; moneyEl.value = "2,256,000";
  const overridden = procMethodCode();
  if (overridden !== "specific") bad++;
  console.log(`   เลือกทับเอง specific ทั้งที่งบ 2,256,000 → ${overridden} ${overridden === "specific" ? "ถูก" : "ผิด"}`);
  pickEl.value = ""; moneyEl.value = VALUES.g_moneyNum;

  console.log(bad ? "\nมีข้อที่ไม่ผ่าน" : "\nผ่านทุกฉบับ");
})().catch(e => { console.error("ERROR", e); process.exit(1); });
