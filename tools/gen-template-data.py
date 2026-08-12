# สร้างไฟล์ base64 ของเทมเพลตทั้งหมดจากไฟล์ .docx ใน templates/
#   - เอกสาร 1-7 (ขออนุมัติโครงการ) -> forms/main-template-data.js   (โหลดตอนเปิดหน้า)
#   - เอกสาร 8-11 (ราคากลาง) 9 ชุด  -> forms/template-data/rc-<work>-<method>.js  (โหลดเฉพาะชุดที่ใช้)
#                                    + forms/template-data/rc-index.js (สารบัญเล็กๆ โหลดตอนเปิดหน้า)
# ต้องรันทุกครั้งที่แก้เทมเพลต (แอปอ่านจาก base64 ในไฟล์ .js อย่างเดียว ไม่ได้อ่าน .docx ตอน runtime)
#   python tools/gen-template-data.py
import base64, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_DIR = os.path.join(ROOT, "templates", "ขออนุมัติโครงการ")
OUT = os.path.join(ROOT, "forms", "main-template-data.js")

RC_DIR = os.path.join(ROOT, "templates", "ราคากลาง")
RC_OUT_DIR = os.path.join(ROOT, "forms", "template-data")
# ชื่อโฟลเดอร์ไทย -> slug ที่ใช้ตั้งชื่อไฟล์ JS (ฝั่งวิธีตรงกับรหัสที่ procMethodCode() คืนค่า)
WORK_SLUG = {"อาคาร": "building", "ทาง": "road", "ชลประทาน": "irrigation"}
METHOD_SLUG = {"เฉพาะเจาะจง": "specific", "ebidding": "ebidding", "egp": "egp"}


def doc_number(name):
    """เลขเอกสารจากชื่อไฟล์ ("8. รายงานการประชุม_template.docx" -> 8) คืน None ถ้าไม่ใช่เทมเพลต"""
    m = re.match(r"^(\d+)\s*\.", name)
    if not m or not name.lower().endswith(".docx"):
        return None
    return int(m.group(1))


def doc_display_name(name):
    """ชื่อที่ใช้ตั้งชื่อไฟล์ผลลัพธ์ = ชื่อไฟล์เทมเพลตตัดส่วน _template.docx ออก"""
    return re.sub(r"_template\.docx$", "", name, flags=re.I)


def js_string(s):
    """escape ข้อความไทยลง JS ได้ปลอดภัย (json.dumps คุม \\ และ " ให้)"""
    return json.dumps(s, ensure_ascii=False)


def gen_main():
    docs = {}
    for name in os.listdir(TPL_DIR):
        n = doc_number(name)
        if n is None:
            continue
        if n in docs:
            sys.exit("มีไฟล์เทมเพลตเลข %d ซ้ำกัน: %s / %s" % (n, docs[n], name))
        docs[n] = name

    if not docs:
        sys.exit("ไม่พบไฟล์เทมเพลตใน " + TPL_DIR)
    nums = sorted(docs)
    if nums != list(range(1, len(nums) + 1)):
        sys.exit("เลขเอกสารไม่ต่อเนื่องจาก 1: " + repr(nums))

    lines = []
    for n in nums:
        with open(os.path.join(TPL_DIR, docs[n]), "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        lines.append('var TEMPLATE_%d_BASE64 = "%s";' % (n, b64))
        print("เอกสาร %d <- %s (%d bytes base64)" % (n, docs[n], len(b64)))

    with io.open(OUT, "w", encoding="utf8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print("เขียน " + OUT + " แล้ว (%d เอกสาร)\n" % len(nums))


def gen_ratekang():
    """เดินโฟลเดอร์ templates/ราคากลาง/<ประเภทงาน>/<วิธี>/ แล้วเขียนไฟล์ JS ชุดละไฟล์ + สารบัญ"""
    if not os.path.isdir(RC_DIR):
        print("ข้ามชุดราคากลาง — ไม่พบ " + RC_DIR)
        return
    if not os.path.isdir(RC_OUT_DIR):
        os.makedirs(RC_OUT_DIR)

    index = {}
    for work in sorted(os.listdir(RC_DIR)):
        work_dir = os.path.join(RC_DIR, work)
        if not os.path.isdir(work_dir):
            continue
        if work not in WORK_SLUG:
            sys.exit("ไม่รู้จักประเภทงาน %r — เพิ่มใน WORK_SLUG ก่อน" % work)
        for method in sorted(os.listdir(work_dir)):
            set_dir = os.path.join(work_dir, method)
            if not os.path.isdir(set_dir):
                continue
            if method not in METHOD_SLUG:
                sys.exit("ไม่รู้จักวิธีจัดซื้อจัดจ้าง %r — เพิ่มใน METHOD_SLUG ก่อน" % method)

            docs = {}
            for name in sorted(os.listdir(set_dir)):
                n = doc_number(name)
                if n is None:
                    continue
                if n in docs:
                    sys.exit("เลข %d ซ้ำใน %s" % (n, set_dir))
                docs[n] = name
            if not docs:
                print("ข้าม %s/%s — ไม่มีไฟล์เทมเพลต" % (work, method))
                continue

            key = "%s/%s" % (WORK_SLUG[work], METHOD_SLUG[method])
            fname = "rc-%s-%s.js" % (WORK_SLUG[work], METHOD_SLUG[method])
            entries = []
            for n in sorted(docs):
                with open(os.path.join(set_dir, docs[n]), "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("ascii")
                entries.append('  "%d": { name: %s, b64: "%s" },'
                               % (n, js_string(doc_display_name(docs[n])), b64))

            body = ("window.RC_TEMPLATES = window.RC_TEMPLATES || {};\n"
                    "window.RC_TEMPLATES[%s] = {\n%s\n};\n"
                    % (js_string(key), "\n".join(entries)))
            with io.open(os.path.join(RC_OUT_DIR, fname), "w", encoding="utf8", newline="\n") as f:
                f.write(body)

            index[key] = {
                "work": work, "method": method, "file": fname,
                "docs": [{"n": n, "name": doc_display_name(docs[n])} for n in sorted(docs)],
            }
            print("ชุด %-12s %-14s -> %s (%d ฉบับ: %s)"
                  % (work, method, fname, len(docs), ", ".join(str(n) for n in sorted(docs))))

    # สารบัญ: บอกว่ามีชุดไหน แต่ละชุดมีเอกสารเลขอะไรชื่ออะไร — โหลดตอนเปิดหน้า (ไฟล์เล็ก ไม่มี base64)
    idx_lines = ["// สารบัญชุดเอกสารราคากลาง (สร้างโดย tools/gen-template-data.py — อย่าแก้มือ)",
                 "window.RC_INDEX = {"]
    for key in sorted(index):
        it = index[key]
        docs_js = ", ".join("{ n: %d, name: %s }" % (d["n"], js_string(d["name"])) for d in it["docs"])
        idx_lines.append('  %s: { work: %s, method: %s, file: %s, docs: [%s] },'
                         % (js_string(key), js_string(it["work"]), js_string(it["method"]),
                            js_string(it["file"]), docs_js))
    idx_lines.append("};\n")
    with io.open(os.path.join(RC_OUT_DIR, "rc-index.js"), "w", encoding="utf8", newline="\n") as f:
        f.write("\n".join(idx_lines))
    print("เขียนสารบัญ forms/template-data/rc-index.js แล้ว (%d ชุด)" % len(index))


if __name__ == "__main__":
    gen_main()
    gen_ratekang()
