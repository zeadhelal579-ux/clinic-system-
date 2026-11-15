# Verify the patient journey and responsive screens against local fixture services.
import json
import os
import secrets
import subprocess
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

BASE = os.environ["CLINIC_TEST_APP_URL"]
SUPABASE = os.environ["SUPABASE_URL"]
DATABASE = os.environ["CLINIC_TEST_DB_URL"]
assert all(urlsplit(url).hostname == "127.0.0.1" for url in (BASE, SUPABASE, DATABASE))
CAPTCHA = """window.turnstile = {
  render(_container, options) { queueMicrotask(() => options.callback('local-fixture')); return 'fixture'; },
  remove() {},
  reset() {}
};"""
ARTIFACTS = Path("back-end/test-results/screenshots")
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def create_staff(role, password):
    email = f"{role}-browser-{secrets.token_hex(6)}@clinic.test"
    key = os.environ["CLINIC_TEST_SUPABASE_ADMIN_KEY"]
    data = json.dumps({
        "email": email, "password": password, "email_confirm": True, "app_metadata": {"clinic_role": role},
    }).encode()
    request = urllib.request.Request(
        SUPABASE + "/auth/v1/admin/users", data=data,
        headers={"Authorization": "Bearer " + key, "apikey": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        assert response.status in (200, 201)
    return email


def attach_challenge(context):
    context.route("https://challenges.cloudflare.com/**", lambda route: route.fulfill(
        status=200, content_type="application/javascript", body=CAPTCHA,
    ))


def log_in(page, identifier, password, destination):
    page.goto(BASE + "/login")
    page.locator('[name="identifier"]').fill(identifier)
    page.locator('[name="password"]').fill(password)
    page.locator('button[type="submit"]').click()
    page.wait_for_url("**" + destination)


with sync_playwright() as runner:
    browser = runner.chromium.launch(executable_path=os.environ.get("CLINIC_TEST_CHROMIUM"))
    patient_context = browser.new_context(viewport={"width": 390, "height": 844})
    attach_challenge(patient_context)
    page = patient_context.new_page()
    page.set_default_timeout(9000)
    page.goto(BASE)
    page.wait_for_url("**/login")
    assert page.locator("html").get_attribute("dir") == "rtl"
    assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
    assert page.get_by_role("heading", level=1).count() == 1
    assert page.locator('label[for]').count() == 2
    page.keyboard.press("Tab")
    assert page.locator('[name="identifier"]').evaluate(
        '(element) => element === document.activeElement && getComputedStyle(element).outlineStyle !== "none"'
    )
    page.screenshot(path=str(ARTIFACTS / "login-mobile.png"))
    page.locator(".forgot-link").click()
    page.locator('[name="phone"]').wait_for()
    page.goto(BASE + "/register")
    password = secrets.token_urlsafe(19)
    page.locator('[name="phone"]').fill("01000000001")
    page.locator('[name="password"]').fill(password)
    page.locator('button[type="submit"]').click()
    page.locator('[name="code"]').fill("١٢٣٤٥٦")
    page.wait_for_url("**/patient/complete-profile")
    assert page.locator("input[readonly]").count() == 1
    page.locator('[name="fullName"]').fill("مريض اختبار")
    page.locator('[name="age"]').fill("38")
    page.locator('[name="address"]').fill("عنوان وهمي")
    page.locator('[name="hasAllergy"][value="yes"]').check()
    page.locator('[name="allergyText"]').fill("تنبيه تجريبي")
    page.locator('[name="hasChronicDisease"][value="no"]').check()
    assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
    page.screenshot(path=str(ARTIFACTS / "profile-mobile.png"))
    page.locator('button[type="submit"]').click()
    page.wait_for_url("**/patient/home")
    page.locator('a[href="/patient/book"]').click()
    target = page.locator(".booking-days a").nth(1)
    destination = target.get_attribute("href")
    held_requests = []
    date_navigation = "**/patient/book?date=**"
    page.route(date_navigation, lambda route: held_requests.append(route))
    target.click()
    page.locator('[aria-busy="true"] [role="status"]').wait_for()
    assert page.locator('button[type="submit"]:visible').count() == 0
    assert held_requests
    for request in held_requests:
        request.continue_()
    page.unroute(date_navigation)
    page.wait_for_url(BASE + destination)
    assert page.locator(".booking-days a[aria-current]").get_attribute("href") == destination
    page.locator('[name="slotStart"]').first.check()
    page.locator('button[type="submit"]').click()
    page.wait_for_url("**/patient/home")
    assert page.locator('section time:visible').count() == 1
    booked_day = page.locator('section time:visible').evaluate("""element => {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo',
            year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(element.dateTime))
        const date = Object.fromEntries(parts.map(part => [part.type, part.value]))
        return [date.year, date.month, date.day].join('-')
    }""")
    assert destination.endswith(booked_day)
    old_slot = page.locator('section time:visible').get_attribute("datetime")
    page.get_by_role("link", name="تعديل الموعد").click()
    page.locator(".booking-days a").nth(2).click()
    page.wait_for_url(lambda url: "appointmentId=" in url and "date=" in url)
    page.locator('[name="slotStart"]').first.check()
    page.get_by_role("button", name="حفظ الموعد الجديد").click()
    page.wait_for_url("**/patient/home")
    assert page.locator('section time:visible').get_attribute("datetime") != old_slot
    page.get_by_role("button", name="إلغاء الموعد", exact=True).click()
    page.get_by_role("button", name="تأكيد الإلغاء").click()
    page.get_by_text("مفيش مواعيد قادمة.", exact=True).wait_for()
    print("PASS patient reschedule and cancellation")
    page.locator('a[href="/patient/book"]').click()
    future = page.locator(".booking-days a").nth(4)
    future_url = future.get_attribute("href")
    future.click()
    page.wait_for_url(BASE + future_url)
    page.locator('[name="slotStart"]').first.check()
    page.get_by_role("button", name="تأكيد الحجز").click()
    page.wait_for_url("**/patient/home")
    page.goto(BASE + "/doctor/queue")
    page.wait_for_url("**/patient/home")
    cookies = [cookie for cookie in patient_context.cookies() if cookie["name"].startswith("sb-")]
    assert cookies and all(cookie["httpOnly"] and cookie["sameSite"] == "Lax" for cookie in cookies)
    page.get_by_role("button", name="تسجيل الخروج").click()
    page.wait_for_url("**/login")
    page.goto(BASE + "/patient/book")
    page.wait_for_url("**/login")
    print("PASS patient registration, OTP, conditional profile, booking, role guard, session cookie and logout")

    subprocess.run(
        ["psql", DATABASE, "-q", "-v", "ON_ERROR_STOP=1",
         "-c", "insert into public.appointments (patient_id, slot_start, slot_end, visit_type, source) "
         "select id, now(), now() + interval '5 minutes', 'new', 'clinic' "
         "from public.patients where phone = '+201000000001'"],
        check=True, capture_output=True,
    )

    for role in ("secretary", "doctor"):
        staff_context = browser.new_context(viewport={"width": 1440, "height": 900})
        attach_challenge(staff_context)
        staff_page = staff_context.new_page()
        staff_page.set_default_timeout(9000)
        destination = f"/{role}/queue"
        log_in(staff_page, create_staff(role, password), password, destination)
        assert staff_page.locator("h1").count() == 1
        staff_page.goto(BASE + ("/doctor/queue" if role == "secretary" else "/secretary/queue"))
        staff_page.wait_for_url("**" + destination)
        assert staff_page.evaluate("document.documentElement.scrollWidth === innerWidth")
        staff_page.screenshot(path=str(ARTIFACTS / f"{role}-desktop.png"))
        if role == "secretary":
            staff_page.get_by_role("link", name="حجز جديد", exact=True).click()
            staff_page.locator('[name="q"]').fill("01000000001")
            staff_page.get_by_role("button", name="بحث", exact=True).click()
            staff_page.get_by_role("link", name="اختيار مريض اختبار").wait_for()
            staff_page.get_by_text("تسجيل مريض جديد", exact=True).click()
            staff_page.locator('[name="fullName"]').fill("مريض استقبال تجريبي")
            staff_page.locator('[name="phone"]').fill("01000000004")
            staff_page.locator('[name="age"]').fill("33")
            staff_page.locator('[name="address"]').fill("عنوان اختبار")
            staff_page.get_by_role("button", name="تسجيل المريض واختيار موعد").click()
            staff_page.wait_for_url("**/secretary/new-booking?patientId=*")
            chosen_day = future_url.split("date=")[1]
            staff_page.locator('[name="date"]').fill(chosen_day)
            staff_page.get_by_role("button", name="عرض المواعيد").click()
            staff_page.wait_for_url(lambda url: "patientId=" in url and "date=" + chosen_day in url)
            staff_page.locator('[name="slotStart"]').first.check()
            staff_page.get_by_role("button", name="تأكيد الحجز").click()
            staff_page.wait_for_url("**/secretary/queue")
            staff_page.get_by_role("link", name="الحجوزات الأونلاين", exact=False).click()
            online = staff_page.locator("section").filter(has=staff_page.get_by_role("heading", name="مريض اختبار", exact=False))
            online.get_by_role("link", name="تعديل الموعد").click()
            staff_page.wait_for_url("**/secretary/new-booking?appointmentId=*")
            staff_page.locator('[name="slotStart"]').first.check()
            staff_page.get_by_role("button", name="حفظ الموعد الجديد").click()
            staff_page.wait_for_url("**/secretary/online")
            online.get_by_role("button", name="إلغاء الموعد", exact=True).click()
            online.get_by_role("button", name="تأكيد الإلغاء").click()
            online.wait_for(state="detached")
            assert staff_page.get_by_text("مريض استقبال تجريبي", exact=True).count() == 0
            staff_page.get_by_role("link", name="طابور اليوم").click()
            print("PASS staff search, walk-in, clinic booking, online reschedule and cancellation")
            staff_page.get_by_role("link", name="المواعيد المتاحة").click()
            staff_page.locator('[name="slotMinutes"]').fill("25")
            staff_page.get_by_role("button", name="حفظ جدول العيادة").click()
            staff_page.get_by_role("status").filter(has_text="تم حفظ جدول العيادة").wait_for()
            staff_page.reload()
            assert staff_page.locator('[name="slotMinutes"]').input_value() == "25"
            staff_page.goto(BASE + destination)
            staff_page.get_by_role("button", name="وصل", exact=True).click()
            staff_page.get_by_role("cell", name="وصل", exact=True).wait_for()
            staff_page.get_by_role("link", name="الخزنة").click()
            staff_page.get_by_role("heading", name="الخزنة").wait_for()
            assert staff_page.locator('[name="priceNew"]').count() == 0
            assert staff_page.locator("tbody tr").count() == 7
            staff_page.goto(BASE + "/secretary/patients")
            staff_page.get_by_role("link", name="عرض مريض اختبار").click()
            staff_page.get_by_role("heading", name="المواعيد السابقة").wait_for()
            assert staff_page.get_by_text("تشخيص تجريبي", exact=False).count() == 0
            assert staff_page.get_by_role("link", name="حجز موعد لهذا المريض").count() == 1
        else:
            staff_page.get_by_role("link", name="ابدأ الكشف").click()
            staff_page.locator('[name="diagnosis"]').fill("تشخيص تجريبي")
            staff_page.get_by_role("button", name="إضافة دواء").click()
            staff_page.get_by_label("اسم الدواء").fill("دواء تجريبي")
            staff_page.get_by_label("الجرعة").fill("جرعة تجريبية")
            staff_page.get_by_label("المدة").fill("مدة تجريبية")
            staff_page.locator('[name="privateNote"]').fill("ملاحظة خاصة تجريبية")
            staff_page.get_by_role("button", name="إنهاء الكشف", exact=True).click()
            staff_page.get_by_role("button", name="تأكيد الحفظ").click()
            staff_page.wait_for_url("**/doctor/queue")
            staff_page.get_by_role("cell", name="تم الكشف", exact=True).wait_for()
            staff_page.get_by_role("link", name="الخزنة").click()
            totals = staff_page.get_by_role("region", name="ملخص الإيراد")
            previous = totals.inner_text()
            staff_page.locator('[name="priceNew"]').fill("275.50")
            staff_page.locator('[name="priceFollowUp"]').fill("125")
            staff_page.get_by_role("button", name="حفظ الأسعار").click()
            staff_page.get_by_role("status").filter(has_text="تم حفظ الأسعار").wait_for()
            staff_page.reload()
            assert float(staff_page.locator('[name="priceNew"]').input_value()) == 275.50
            assert totals.inner_text() == previous
            staff_page.goto(BASE + "/doctor/patients")
            staff_page.get_by_role("link", name="عرض مريض اختبار").click()
            staff_page.get_by_text("تشخيص تجريبي", exact=False).wait_for()
            staff_page.get_by_text("ملاحظة خاصة تجريبية", exact=False).wait_for()
            staff_page.get_by_role("button", name="تعديل التنبيهات الطبية").click()
            staff_page.locator('[name="allergyText"]').fill("حساسية محدّثة")
            staff_page.get_by_role("button", name="حفظ التنبيهات الطبية").click()
            staff_page.get_by_text("الحساسية · حساسية محدّثة", exact=True).wait_for()
            walk_in_record = staff_page.get_by_role("link", name="عرض مريض استقبال تجريبي")
            walk_in_url = walk_in_record.get_attribute("href")
            walk_in_record.click()
            staff_page.wait_for_url(BASE + walk_in_url)
            staff_page.get_by_role("heading", name="مريض استقبال تجريبي", exact=True).wait_for()
            staff_page.get_by_text("الحساسية · غير مسجّل", exact=True).wait_for()
            staff_page.get_by_role("button", name="تعديل التنبيهات الطبية").click()
            staff_page.locator('[name="hasAllergy"][value="no"]').check()
            staff_page.locator('[name="hasChronicDisease"][value="no"]').check()
            staff_page.get_by_role("button", name="حفظ التنبيهات الطبية").click()
            staff_page.get_by_text("تم تحديث التنبيهات الطبية.", exact=True).wait_for()
            staff_page.get_by_text("الحساسية · لا", exact=True).wait_for()
        staff_context.close()
        print(f"PASS {role} staff login, own queue and other-role guard")
    print("PASS schedule update persisted, secretary arrival, doctor completion and return to queue")
    log_in(page, "01000000001", password, "/patient/home")
    page.get_by_role("link", name="السجل الطبي").click()
    page.get_by_text("تشخيص تجريبي", exact=True).wait_for()
    assert page.get_by_text("ملاحظة خاصة تجريبية", exact=False).count() == 0
    print("PASS cashbox visibility and rates, frozen revenue, patient record and private note isolation")
    page.goto(BASE + "/patient/my-data")
    assert page.locator('[name="allergyText"]').input_value() == "حساسية محدّثة"
    page.locator('[name="address"]').fill("عنوان جديد للاختبار")
    page.get_by_role("button", name="حفظ التعديلات").click()
    page.get_by_text("تم حفظ التعديلات.", exact=True).wait_for()
    page.reload()
    assert page.locator('[name="address"]').input_value() == "عنوان جديد للاختبار"
    page.get_by_role("button", name="تغيير رقم الموبايل").click()
    page.get_by_label("رقم الموبايل الجديد", exact=True).fill("01000000005")
    page.get_by_role("button", name="إرسال الكود", exact=True).click()
    page.locator('[name="code"]').fill("٤٥٦٧٨٩")
    page.get_by_role("button", name="تأكيد الرقم الجديد").click()
    page.get_by_text("تم تأكيد الرقم الجديد.", exact=True).wait_for()
    page.reload()
    assert page.get_by_label("رقم الموبايل المؤكّد").input_value() == "+201000000005"
    page.get_by_role("button", name="تسجيل الخروج").click()
    page.wait_for_url("**/login")
    log_in(page, "01000000005", password, "/patient/home")
    print("PASS staff record scoping, doctor medical alerts, patient edits and verified phone change")
    browser.close()

    for name in ("firefox", "webkit"):
        try:
            engine = getattr(runner, name)
            alternate = engine.launch(timeout=8000)
        except Exception as error:
            print(f"UNVERIFIED {name} launch: {type(error).__name__}")
            continue
        try:
            for width in (390, 1440):
                public = alternate.new_page(viewport={"width": width, "height": 900})
                assert public.goto(BASE + "/login", timeout=7000).status == 200
                assert public.locator("html").get_attribute("dir") == "rtl"
                assert public.evaluate("document.documentElement.scrollWidth === innerWidth")
                public.close()
            print(f"PASS {name} login at 390px and 1440px")
        finally:
            alternate.close()
