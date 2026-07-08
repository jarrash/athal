import Link from "next/link";
import { CitationChip, Mono } from "@/components/ui";

/** Public marketing page — the defensibility promise. */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center gap-6 bg-ink px-8 py-4">
        <span className="inline-flex rounded-[2px] bg-gold px-3 py-[7px] leading-none">
          <span className="text-[16px] font-bold leading-none text-ink">أثالــــ</span>
        </span>
        <div className="hidden items-center gap-5 text-[12.5px] font-medium text-navtext md:flex">
          <span className="cursor-pointer hover:text-gold">المنصة</span>
          <span className="cursor-pointer hover:text-gold">الدفاعية القضائية</span>
          <span className="cursor-pointer hover:text-gold">الأمان والسيادة</span>
          <span className="cursor-pointer hover:text-gold">الأسعار</span>
        </div>
        <div className="flex-1" />
        <Link href="/login" className="rounded-[2px] border border-ink-border px-4 py-2 text-[12px] font-semibold text-paper hover:border-gold hover:text-gold">
          تسجيل الدخول
        </Link>
        <a href="#cta" className="rounded-[2px] bg-gold px-4 py-2 text-[12px] font-bold text-ink shadow-btn hover:bg-gold-hover">
          اطلب عرضًا توضيحيًا
        </a>
      </nav>

      {/* Hero */}
      <header className="ink-grid flex flex-col items-center gap-7 px-6 pb-24 pt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-[2px] border border-ink-border bg-ink-hover px-3.5 py-1.5 text-[11px] font-bold text-gold">
          🇸🇦 معالجة سيادية — بياناتك لا تغادر المملكة
        </span>
        <h1 className="m-0 max-w-[820px] text-[34px] font-bold leading-[1.5] text-paper md:text-[46px]">
          منصة الخبرة القضائية التي تحوّل الأدلة إلى تقارير يمكن الدفاع عنها
        </h1>
        <p className="m-0 max-w-[640px] text-[15px] leading-[2] text-navtext">
          الذكاء يقترح، والخبير يعتمد. كل استنتاج في تقريرك مسند إلى دليل مرقّم ببصمة رقمية،
          وكل إجراء مقيّد في سجل غير قابل للتعديل — من الاستلام حتى الإيداع.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="#cta" className="rounded-[2px] bg-gold px-6 py-3 text-[13.5px] font-bold text-ink shadow-btn hover:bg-gold-hover">
            اطلب عرضًا توضيحيًا
          </a>
          <Link href="/login" className="rounded-[2px] border border-ink-border px-6 py-3 text-[13.5px] font-semibold text-paper hover:border-gold hover:text-gold">
            شاهد المنصة — دقيقتان
          </Link>
        </div>

        {/* Product teaser card */}
        <div className="mt-6 w-full max-w-[680px] rounded-[2px] border border-line bg-paper p-6 text-start shadow-modal">
          <div className="flex items-center gap-2 border-b border-divider pb-3">
            <span className="rounded-[2px] bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
              استنتاج <Mono>4.1</Mono>
            </span>
            <span className="rounded-[2px] border border-ok-border bg-ok-bg px-2 py-0.5 text-[10px] font-bold text-ok">✓ معتمد — خ. العتيبي</span>
          </div>
          <p className="m-0 pt-3 text-[13.5px] leading-loose text-body">
            يثبت للخبير أن المدعى عليه تجاوز مدة التنفيذ التعاقدية المحددة في المادة الرابعة عشرة
            <CitationChip refCode="دليل-014" /> بواقع أربعة وتسعين يومًا، وفق مراسلة إخطار التأخير
            <CitationChip refCode="بريد-012" />.
          </p>
          <Mono className="block pt-3 text-start text-[9.5px] text-t3">
            SHA-256 verified · WORM compliance-lock · eventHash = H(prevEventHash + payload) ✓
          </Mono>
        </div>
      </header>

      {/* Pillars */}
      <section className="flex flex-col items-center gap-10 bg-paper px-6 py-20">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-[12px] font-bold text-warn-deep">لماذا أثال؟</span>
          <h2 className="m-0 text-[26px] font-bold text-t1">الدفاعية ليست ميزة — إنها المنتج</h2>
        </div>
        <div className="grid max-w-[1060px] grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              title: "خزنة أدلة لا يمكن العبث بها",
              body: "تخزين WORM بقفل الامتثال، بصمة SHA-256 بتحقق مزدوج لكل ملف، وسلسلة عهدة كاملة من الإيداع حتى الاستشهاد. التصحيح يكون بدليل جديد — لا تعديل ولا حذف أبدًا.",
            },
            {
              title: "مساعد ذكي، لا طيار آلي",
              body: "كل مخرجات الذكاء تحمل نسبة ثقة ومسار استدلال، ولا يدخل أي منها التقرير قبل اعتماد موقّع من الخبير بمصادقة معززة. الاعتماد والرفض كلاهما مقيّد في السجل.",
            },
            {
              title: "كل جملة في التقرير مسندة",
              body: "شارات استشهاد مرقّمة داخل النص تقفز إلى الدليل نفسه، وبوابة ما قبل التصدير تمنع أي استنتاج بلا مصدر — والملاحق تتولّد تلقائيًا.",
            },
          ].map((p, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[2px] border border-line bg-white p-6 shadow-card">
              <span className="h-0.5 w-10 bg-gold" />
              <h3 className="m-0 text-[15.5px] font-bold text-t1">{p.title}</h3>
              <p className="m-0 text-[12.5px] leading-[2] text-t2">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="flex flex-col items-center gap-10 bg-paper-alt px-6 py-20">
        <h2 className="m-0 text-[24px] font-bold text-t1">من قرار التكليف إلى تقرير مودع</h2>
        <div className="grid max-w-[1060px] grid-cols-1 gap-6 md:grid-cols-4">
          {[
            ["01", "الاستلام والتحليل", "تحليل قرار التكليف آليًا إلى أسئلة محكمة ونطاق مهمة يعتمدها الخبير بندًا بندًا."],
            ["02", "جمع الأدلة", "إيداع دائم ببصمة رقمية وفحص أمني مزدوج وسلسلة عهدة لكل ملف."],
            ["03", "التحليل والاعتماد", "مصفوفة التزامات مستخرجة آليًا بنسب ثقة — والقرار النهائي للخبير وحده."],
            ["04", "التقرير والإيداع", "استنتاجات مرقّمة مسندة بالأدلة، وبوابة استشهاد صارمة قبل التصدير."],
          ].map(([n, t, b]) => (
            <div key={n} className="flex flex-col gap-2.5 border-t-2 border-gold pt-4">
              <Mono className="text-[12px] font-semibold text-warn-deep">{n}</Mono>
              <h3 className="m-0 text-[14px] font-bold text-t1">{t}</h3>
              <p className="m-0 text-[12px] leading-[1.9] text-t2">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sovereignty band */}
      <section className="ink-grid grid grid-cols-1 gap-10 px-8 py-20 md:grid-cols-2 md:px-16">
        <div className="flex flex-col gap-4">
          <h2 className="m-0 text-[26px] font-bold leading-[1.6] text-paper">بياناتك القضائية لا تغادر المملكة</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[13px] leading-[1.9] text-navtext">
            <li>✓ امتثال كامل لنظام حماية البيانات الشخصية (PDPL)</li>
            <li>✓ سجل إجراءات شامل غير قابل للمحو — يُصدَّر ملحقًا رسميًا للتقرير</li>
            <li>✓ عزل تام لبيانات كل مكتب خبرة (مستأجر) عن غيره</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-[2px] border border-ink-border bg-ink-hover p-6">
          <span className="text-[12px] font-bold text-gold">سلسلة العهدة — عينة حية</span>
          {[
            ["إيداع أصلي + بصمة رقمية", "أ. سارة القحطاني"],
            ["تحقق الخادم من البصمة", "النظام — تحقق مزدوج"],
            ["تحليل آلي — استخراج الالتزامات", "المساعد الذكي (سيادي)"],
          ].map(([a, b], i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`h-2 w-2 flex-none rounded-full ${i === 0 ? "bg-gold" : "bg-navtext"}`} />
              <span className="text-[11.5px] font-semibold text-paper">{a}</span>
              <span className="ms-auto text-[10px] text-navtext">{b}</span>
            </div>
          ))}
          <Mono className="mt-2 text-start text-[9.5px] text-gold">
            eventHash = H(prevEventHash + payload) ✓ verified
          </Mono>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="flex flex-col items-center gap-6 bg-paper px-6 py-20 text-center">
        <h2 className="m-0 max-w-[560px] text-[24px] font-bold leading-[1.7] text-t1">
          جاهز لتقرير يصمد أمام الاستجواب؟
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="mailto:sales@athal.sa" className="rounded-[2px] bg-ink px-6 py-3 text-[13.5px] font-bold text-paper shadow-btn hover:bg-ink-hover">
            اطلب عرضًا توضيحيًا
          </a>
          <a href="mailto:sales@athal.sa" className="rounded-[2px] border border-line bg-white px-6 py-3 text-[13.5px] font-semibold text-t1 hover:border-gold">
            تواصل مع المبيعات
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-3 bg-ink px-6 py-10 text-center">
        <span className="inline-flex rounded-[2px] bg-gold px-2.5 py-1.5 leading-none">
          <span className="text-[13px] font-bold leading-none text-ink">أثالــــ</span>
        </span>
        <span className="text-[11px] text-navtext">© ١٤٤٨هـ منصة أثال — جميع الحقوق محفوظة</span>
        <div className="flex gap-4 text-[11px] text-navtext">
          <span className="cursor-pointer hover:text-gold">الخصوصية</span>
          <span className="cursor-pointer hover:text-gold">الشروط</span>
          <span className="cursor-pointer hover:text-gold">الدعم</span>
        </div>
      </footer>
    </div>
  );
}
