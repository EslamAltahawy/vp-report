document.addEventListener('DOMContentLoaded', () => {
    // جلب العناصر الأساسية
    const form = document.getElementById('report-form');
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    const attendanceRowsContainer = document.getElementById('attendance-rows');
    const previewArea = document.getElementById('report-preview');
    const pdfBtn = document.getElementById('pdf-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const printBtn = document.getElementById('print-btn');

    // استيراد مكتبة jsPDF
    const { jsPDF } = window.jspdf;

    // --- 1. إضافة موظف ---
    addEmployeeBtn.addEventListener('click', () => {
        const rowId = `row-${Date.now()}`;
        const employeeRow = document.createElement('div');
        employeeRow.classList.add('employee-row');
        employeeRow.id = rowId;
        
        employeeRow.innerHTML = `
            <input type="text" class="employee-name" placeholder="اسم الموظف" required>
            <select class="employee-status">
                <option value="حاضر">حاضر</option>
                <option value="غائب">غائب</option>
                <option value="إجازة">إجازة</option>
                <option value="مهمة عمل">مهمة عمل</option>
            </select>
            <button type="button" class="remove-btn" data-row-id="${rowId}">-</button>
        `;
        
        attendanceRowsContainer.appendChild(employeeRow);

        // إضافة حدث لزر الحذف
        employeeRow.querySelector('.remove-btn').addEventListener('click', (e) => {
            const rowToRemove = document.getElementById(e.target.dataset.rowId);
            if (rowToRemove) {
                rowToRemove.remove();
                updatePreview();
            }
        });
        
        // تحديث المعاينة عند تغيير البيانات
        employeeRow.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', updatePreview);
        });
    });

    // --- 2. جمع بيانات النموذج ---
    function getFormData() {
        const attendance = [];
        document.querySelectorAll('.employee-row').forEach(row => {
            const name = row.querySelector('.employee-name').value;
            const status = row.querySelector('.employee-status').value;
            if (name) { // فقط أضف إذا كان الاسم موجوداً
                attendance.push({ name, status });
            }
        });

        return {
            date: document.getElementById('report-date').value,
            author: document.getElementById('report-author').value,
            adminSummary: document.getElementById('admin-summary').value,
            techTasks: document.getElementById('tech-tasks').value,
            issues: document.getElementById('issues').value,
            generalNotes: document.getElementById('general-notes').value,
            tomorrowPlan: document.getElementById('tomorrow-plan').value,
            attendance: attendance
        };
    }

    // --- 3. تحديث المعاينة ---
    function updatePreview() {
        const data = getFormData();
        
        let attendanceHtml = '<h3>حضور الموظفين</h3>';
        if (data.attendance.length > 0) {
            attendanceHtml += '<table><thead><tr><th>الاسم</th><th>الحالة</th></tr></thead><tbody>';
            data.attendance.forEach(emp => {
                attendanceHtml += `<tr><td>${emp.name}</td><td>${emp.status}</td></tr>`;
            });
            attendanceHtml += '</tbody></table>';
        } else {
            attendanceHtml += '<p>لم يتم إضافة موظفين.</p>';
        }

        previewArea.innerHTML = `
            <h2>التقرير اليومي - ${data.date || ' (اختر تاريخ)'}</h2>
            <p><strong>مُعد التقرير:</strong> ${data.author || ' (ادخل الاسم)'}</p>
            
            ${attendanceHtml}

            <h3>الملخص الإداري</h3>
            <p>${data.adminSummary || 'لا يوجد'}</p>
            
            <h3>مهام الفريق التقني</h3>
            <p>${data.techTasks || 'لا يوجد'}</p>
            
            <h3>المشاكل أو التحديات</h3>
            <p>${data.issues || 'لا يوجد'}</p>
            
            <h3>ملاحظات عامة</h3>
            <p>${data.generalNotes || 'لا يوجد'}</p>
            
            <h3>خطة عمل الغد</h3>
            <p>${data.tomorrowPlan || 'لا يوجد'}</p>
        `;
    }

    // ربط تحديث المعاينة بجميع حقول النموذج
    form.addEventListener('input', updatePreview);

    // --- 4. حفظ واسترجاع المسودة ---
    saveDraftBtn.addEventListener('click', () => {
        const data = getFormData();
        localStorage.setItem('reportDraft', JSON.stringify(data));
        alert('تم حفظ المسودة بنجاح!');
    });

    function loadDraft() {
        const draft = localStorage.getItem('reportDraft');
        if (draft) {
            const data = JSON.parse(draft);
            
            document.getElementById('report-date').value = data.date;
            document.getElementById('report-author').value = data.author;
            document.getElementById('admin-summary').value = data.adminSummary;
            document.getElementById('tech-tasks').value = data.techTasks;
            document.getElementById('issues').value = data.issues;
            document.getElementById('general-notes').value = data.generalNotes;
            document.getElementById('tomorrow-plan').value = data.tomorrowPlan;

            // إعادة بناء صفوف الموظفين
            attendanceRowsContainer.innerHTML = ''; // مسح القديم
            data.attendance.forEach(emp => {
                addEmployeeBtn.click(); // إضافة صف جديد
                const lastRow = attendanceRowsContainer.lastChild;
                lastRow.querySelector('.employee-name').value = emp.name;
                lastRow.querySelector('.employee-status').value = emp.status;
            });
            
            updatePreview(); // تحديث المعاينة بالبيانات المحملة
        }
    }
    
    // تحميل المسودة عند فتح الصفحة
    loadDraft();

    // --- 5. وظيفة الطباعة ---
    printBtn.addEventListener('click', () => {
        window.print();
    });


    // --- 6. وظيفة تصدير PDF (الأهم) ---
    pdfBtn.addEventListener('click', () => {
        try {
            const data = getFormData();
            if (!data.date || !data.author) {
                alert('يرجى ملء تاريخ التقرير واسم المُعد أولاً.');
                return;
            }

            const doc = new jsPDF();

            // --- !! خطوة دمج الخط العربي !! ---
            // نتأكد أن المتغير cairoFontBase64 موجود (من ملف cairo-font-base64.js)
            if (typeof cairoFontBase64 === 'undefined') {
                alert("خطأ: ملف الخط (cairo-font-base64.js) غير موجود أو فارغ.");
                return;
            }

            // 1. إضافة ملف الخط لـ VFS (نظام الملفات الافتراضي)
            doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
            
            // 2. إضافة الخط لـ jsPDF
            doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
            
            // 3. ضبط الخط كخط افتراضي للمستند
            doc.setFont('Cairo');
            
            // ضبط اتجاه المستند للغة العربية
            doc.setLanguage('ar');

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const startX = pageWidth - margin; // نقطة البداية من اليمين
            let currentY = 20;

            // --- كتابة محتوى PDF ---

            // العنوان
            doc.setFontSize(20);
            doc.text(`التقرير اليومي`, startX, currentY, { align: 'right' });
            currentY += 10;

            // معلومات التقرير
            doc.setFontSize(12);
            doc.text(`التاريخ: ${data.date}`, startX, currentY, { align: 'right' });
            doc.text(`مُعد التقرير: ${data.author}`, startX - 80, currentY, { align: 'right' }); // بجانبه
            currentY += 15;

            // --- جدول الحضور ---
            if (data.attendance.length > 0) {
                const head = [['الحالة', 'الاسم']]; // ترتيب الأعمدة معكوس ليناسب RTL
                const body = data.attendance.map(emp => [emp.status, emp.name]);

                doc.autoTable({
                    startY: currentY,
                    head: head,
                    body: body,
                    theme: 'grid',
                    headStyles: {
                        font: 'Cairo', // تطبيق الخط على الرأس
                        fillColor: [0, 123, 255], // لون أزرق
                        textColor: [255, 255, 255],
                        halign: 'right' // محاذاة لليمين
                    },
                    bodyStyles: {
                        font: 'Cairo', // تطبيق الخط على الجسم
                        halign: 'right' // محاذاة لليمين
                    }
                });
                currentY = doc.autoTable.previous.finalY + 15; // الحصول على الموضع بعد الجدول
            }

            // --- أقسام التقرير ---
            function addSection(title, content) {
                if (!content) content = 'لا يوجد';
                
                doc.setFontSize(16);
                doc.text(title, startX, currentY, { align: 'right' });
                currentY += 8;
                
                doc.setFontSize(12);
                // doc.splitTextToSize لتقسيم النصوص الطويلة
                const textLines = doc.splitTextToSize(content, (pageWidth - margin * 2));
                doc.text(textLines, startX, currentY, { align: 'right' });
                
                currentY += (textLines.length * 7) + 10; // حساب الارتفاع بناءً على عدد الأسطر
            }

            addSection('الملخص الإداري', data.adminSummary);
            addSection('مهام الفريق التقني', data.techTasks);
            addSection('المشاكل أو التحديات', data.issues);
            addSection('ملاحظات عامة', data.generalNotes);
            addSection('خطة عمل الغد', data.tomorrowPlan);

            // --- الحفظ ---
            doc.save(`تقرير-${data.date}.pdf`);

        } catch (error) {
            console.error("خطأ أثناء إنشاء PDF:", error);
            alert("حدث خطأ أثناء إنشاء ملف PDF. تأكد من تحميل الخط بشكل صحيح.");
        }
    });

});