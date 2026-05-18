const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzzdPUds4cp882xpCAXCCAlmmRrCTTb9Dy5S7jpCbsZhO3yixyORfL2MFiEdePW1ktl/exec"; 
    
    const COLOR_PASSWORDS = {
        'red123': { name: 'Red', thName: 'สีแดง' },
        'blue123': { name: 'Blue', thName: 'สีน้ำเงิน' },
        'green123': { name: 'Green', thName: 'สีเขียว' },
        'yellow123': { name: 'Yellow', thName: 'สีเหลือง' }
    };

    let studentDatabase = []; 
    let selectedColor = "";
    let currentStudent = null;

    window.onload = async () => {
        try {
            const response = await fetch(`${SCRIPT_URL}?get=all`);
            studentDatabase = await response.json();
            console.log("โหลดฐานข้อมูลนักเรียนสำเร็จ!");
        } catch (e) {
            console.error("ไม่สามารถโหลดข้อมูลนักเรียนได้");
        }
    };

    // ฟังก์ชันตรวจสอบรหัสผ่านเพื่อเข้าหน้าสี
    function checkPassword() {
        const inputPass = document.getElementById('color-password').value.trim();
        const errorDiv = document.getElementById('login-error');
        
        if (COLOR_PASSWORDS[inputPass]) {
            errorDiv.innerText = "";
            selectedColor = COLOR_PASSWORDS[inputPass].name;
            const thName = COLOR_PASSWORDS[inputPass].thName;
            
            // สลับหน้าจอ
            document.getElementById('page-login').classList.add('hidden');
            document.getElementById('page-entry').classList.remove('hidden');
            
            // เปลี่ยนหัวข้อและสีตามที่ล็อกอินเข้ามา
            const title = document.getElementById('form-title');
            title.innerText = `ฟอร์มบันทึกข้อมูล - ${thName}`;
            title.style.color = selectedColor === 'Yellow' ? '#b8b800' : (selectedColor === 'Green' ? '#00802b' : selectedColor);
        } else {
            errorDiv.innerText = "❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
        }
    }

    // ค้นหานักเรียนแบบเรียลไทม์
    function lookupStudent() {
        const id = document.getElementById('student-id').value;
        const preview = document.getElementById('preview-name');

        if (id.length < 3) {
            preview.innerHTML = "<span style='color:#666;'>กำลังรอเลขประจำตัว...</span>";
            currentStudent = null;
            return;
        }

        const student = studentDatabase.find(row => row[0].toString() === id);

        if (student) {
            const levelText = student[3] && student[3].toUpperCase() === 'J' ? 'ม.ต้น' : 'ม.ปลาย';
            currentStudent = { 
                name: student[1], 
                grade: student[2],
                level: student[3] || 'J' 
            };
            preview.innerHTML = `<span style="color:green; font-weight:bold;">✔ พบข้อมูล:</span><br>
                                 <strong>ชื่อ:</strong> ${student[1]}<br>
                                 <strong>ชั้น:</strong> ${student[2]} (${levelText})`;
        } else {
            currentStudent = null;
            preview.innerHTML = `<span style="color:red; font-weight:bold;">✘ ไม่พบเลขประจำตัวนี้ในระบบ</span>`;
        }
    }

    async function submitData() {
        if (!currentStudent) {
            alert("กรุณากรอกเลขประจำตัวนักเรียนให้ถูกต้องก่อนบันทึก!");
            return;
        }
        
        const btn = document.getElementById('submit-btn');
        const status = document.getElementById('status');
        const sport = document.getElementById('sport-name').value;
        
        btn.disabled = true;
        status.innerHTML = "<span style='color:orange;'>กำลังบันทึกข้อมูล...</span>";

        const payload = {
            id: document.getElementById('student-id').value,
            name: currentStudent.name,
            grade: currentStudent.grade,
            level: currentStudent.level, 
            sport: sport,
            color: selectedColor
        };

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(payload)
            });

            status.innerHTML = `<span style="color:green;">✅ บันทึกข้อมูลเรียบร้อยแล้ว!</span>`;
            
            // รีเซ็ตเฉพาะช่องกรอกข้อมูลนักเรียน (ยังคงล็อกอินอยู่ในหน้าสีเดิม)
            document.getElementById('student-id').value = "";
            document.getElementById('preview-name').innerHTML = "<span style='color:#666;'>กรุณาพิมพ์เลขประจำตัวนักเรียนคนถัดไป...</span>";
            currentStudent = null;
            
            setTimeout(() => { status.innerText = ""; }, 3000);
        } catch (e) {
            status.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต</span>`;
        }
        btn.disabled = false;
    }