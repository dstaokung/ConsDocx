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
};

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

const html = fs.readFileSync(path.join(ROOT, "forms/main.html"), "utf8");
const inline = html.slice(html.lastIndexOf("<script>") + "<script>".length, html.lastIndexOf("</script>"));
vm.runInContext(inline, sandbox, { filename: "main.html inline" });

(async () => {
  const unzip = sandbox.JSZip;
  const DOC_INFO = vm.runInContext("DOC_INFO", sandbox); // const ใน vm ไม่โผล่บน global object
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
           `เดือน  ${VALUES.g_month}  พ.ศ.${VALUES.g_year}`];
      want.forEach(s => console.log(`   ${text.includes(s) ? "พบ  " : "ไม่พบ"} ${s}`));
    }
  }
  console.log(bad ? "\nมีเอกสารที่ placeholder ค้าง" : "\nผ่านทุกฉบับ");
})().catch(e => { console.error("ERROR", e); process.exit(1); });
