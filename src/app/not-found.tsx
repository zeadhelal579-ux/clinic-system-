// Give missing pages a link back to the role-aware entry point.
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="auth-card screen-heading">
        <h1>الصفحة غير موجودة</h1>
        <Link href="/" className="button button--secondary">الرجوع للصفحة الرئيسية</Link>
      </section>
    </main>
  );
}
