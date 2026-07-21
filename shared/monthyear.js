// ---- รายชื่อเดือนไทย + แปลงเลขอารบิกเป็นเลขไทย ใช้ร่วมกันทุกหน้า (main + เอกสาร 1-5) ----
window.ConsDocxMonthYear = (function () {
  var MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  var THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

  function toThaiDigits(n) {
    return String(n).replace(/[0-9]/g, function (d) { return THAI_DIGITS[+d]; });
  }

  function currentMonth() {
    return MONTHS[new Date().getMonth()];
  }

  function currentYearThai() {
    var beYear = new Date().getFullYear() + 543;
    return toThaiDigits(beYear);
  }

  // รายการปี พ.ศ. (เลขไทย) รอบๆ ปีปัจจุบัน ให้เลือกล่วงหน้า/ย้อนหลังได้
  function yearOptionsThai(spread) {
    spread = spread || 3;
    var centerBE = new Date().getFullYear() + 543;
    var out = [];
    for (var i = -spread; i <= spread; i++) {
      out.push(toThaiDigits(centerBE + i));
    }
    return out;
  }

  // เติม <option> ให้ select เดือน/ปี แล้วตั้งค่าเริ่มต้นเป็นเดือน/ปีปัจจุบันเสมอตอนสร้าง options ใหม่
  // (สำคัญ: <select> ที่เพิ่ง append option จะ auto-select ตัวเลือกแรกให้เองอยู่แล้ว ทำให้ sel.value
  // ไม่ใช่ค่าว่างตั้งแต่แรก เช็ค "if (!sel.value)" แล้วข้ามไปเลยไม่ตั้งเดือน/ปีปัจจุบันให้ตามที่ตั้งใจไว้
  // จึงต้องตั้งค่าตรงๆ เสมอ ส่วนค่าที่เคยบันทึกไว้ก่อนหน้า (autosave) หรือส่งมาจากหน้า main จะมาทับ
  // อีกทีในโค้ดที่เรียกหลังจากนี้อยู่แล้ว ไม่ต้องกลัวว่าจะไปทับค่าที่ผู้ใช้เคยเลือกไว้)
  function populateMonthSelect(sel) {
    if (!sel || sel.dataset.filled === "1") return;
    sel.dataset.filled = "1";
    MONTHS.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
    sel.value = currentMonth();
  }

  function populateYearSelect(sel, spread) {
    if (!sel || sel.dataset.filled === "1") return;
    sel.dataset.filled = "1";
    yearOptionsThai(spread).forEach(function (y) {
      var opt = document.createElement("option");
      opt.value = y;
      opt.textContent = "พ.ศ. " + y;
      sel.appendChild(opt);
    });
    sel.value = currentYearThai();
  }

  return {
    MONTHS: MONTHS,
    toThaiDigits: toThaiDigits,
    currentMonth: currentMonth,
    currentYearThai: currentYearThai,
    yearOptionsThai: yearOptionsThai,
    populateMonthSelect: populateMonthSelect,
    populateYearSelect: populateYearSelect,
  };
})();
