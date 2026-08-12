# สร้าง forms/main-template-data.js จากไฟล์ .docx ใน templates/ขออนุมัติโครงการ/
# ต้องรันทุกครั้งที่แก้เทมเพลต (แอปอ่านจาก base64 ในไฟล์ .js อย่างเดียว ไม่ได้อ่าน .docx ตอน runtime)
#   python tools/gen-template-data.py
import base64, io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_DIR = os.path.join(ROOT, "templates", "ขออนุมัติโครงการ")
OUT = os.path.join(ROOT, "forms", "main-template-data.js")


def main():
    # จับคู่ไฟล์กับหมายเลขเอกสารจากเลขนำหน้าชื่อไฟล์ ("1. ...", "6....")
    docs = {}
    for name in os.listdir(TPL_DIR):
        m = re.match(r"^(\d+)\s*\.", name)
        if not m or not name.lower().endswith(".docx"):
            continue
        n = int(m.group(1))
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
    print("เขียน " + OUT + " แล้ว (%d เอกสาร)" % len(nums))


if __name__ == "__main__":
    main()
