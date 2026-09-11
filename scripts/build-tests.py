# -*- coding: utf-8 -*-
"""
Generates src/content/tests/*.ts from the therapist's specification document.

The five questionnaires are 241 questions of Persian text plus their scoring
keys; typing them out by hand would introduce errors nobody would ever notice.
This parses the tables straight out of the source document instead, and asserts
the counts the document itself states, so a mis-parse fails loudly here rather
than silently scoring somebody's depression inventory wrong.

    npm run build:tests

Re-run it only if the source document changes; the generated files are the
ones under version control.
"""
import io
import re
import sys
from collections import Counter, OrderedDict

src = sys.argv[1] if len(sys.argv) > 1 else 'docs/tests-source.txt'
raw = io.open(src, encoding='utf-8').read()

FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
to_latin = lambda s: ''.join(str(FA_DIGITS.index(c)) if c in FA_DIGITS else c for c in s)


def clean(s):
    return re.sub(r'\s+', ' ', s).strip()


def strip_english(s):
    """« رهاشدگی (Abandonment) » -> « رهاشدگی »."""
    return clean(re.sub(r'\([^)]*\)', '', s))


def ts(value, indent=0):
    """Minimal, deterministic TS literal printer."""
    pad = '  ' * indent
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(value, (list, tuple)):
        if not value:
            return '[]'
        inner = ',\n'.join(pad + '  ' + ts(v, indent + 1) for v in value)
        return '[\n' + inner + ',\n' + pad + ']'
    if isinstance(value, (dict, OrderedDict)):
        inner = ',\n'.join(
            pad + '  ' + k + ': ' + ts(v, indent + 1) for k, v in value.items()
        )
        return '{\n' + inner + ',\n' + pad + '}'
    raise TypeError(type(value))


def rows(block, columns):
    """Pipe-table rows with exactly `columns` cells, ignoring the header rule."""
    out = []
    for line in block.split('\n'):
        line = line.strip()
        if not line.startswith('|') or set(line) <= set('|- '):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) == columns and re.match(r'^Q\d+$', cells[0]):
            out.append(cells)
    return out


def section(start, end=None):
    i = raw.index(start)
    j = raw.index(end, i) if end else len(raw)
    return raw[i:j]


def scales_from(pairs, maxima):
    """
    Ordered subscales, one per group.

    Each is named by whichever label is most common within its group: the
    source tables spell a subscale out in full on its first row («رهاشدگی
    (Abandonment)») and use the short form on the rest, so the majority wins.
    The key is derived from the group's first question, which is stable across
    rewordings in a way the Persian title is not.
    """
    groups = OrderedDict()
    for group, label, domain, qid in pairs:
        groups.setdefault(group, []).append((label, domain, qid))
    out = []
    for members in groups.values():
        label = Counter(m[0] for m in members).most_common(1)[0][0]
        entry = OrderedDict(
            key='s%d' % members[0][2], title=label, max=maxima(len(members))
        )
        domain = members[0][1]
        if domain:
            entry['domain'] = domain
        out.append(entry)
    return out


tests = OrderedDict()

# ------------------------------------------------------------------ BDI-II
block = section('| Q1 | اندوه و غمگینی', 'منطق نمایش نتیجه')
# Each item spans several lines: "| Qn | topic | 0: ... \n 1: ... \n ... |".
items = re.findall(r'\|\s*(Q\d+)\s*\|([^|]*)\|(.*?)\|', block, re.S)
bdi = []
for qid, topic, options in items:
    choices = []
    for line in options.split('\n'):
        m = re.match(r'^\s*([۰-۹\d])\s*[:：]\s*(.+?)\s*$', line)
        if m:
            choices.append(OrderedDict(label=clean(m.group(2)), value=int(to_latin(m.group(1)))))
    assert len(choices) == 4, (qid, choices)
    bdi.append(
        OrderedDict(
            id=int(qid[1:]), text=clean(topic), scale='total',
            choices=choices,
        )
    )
assert len(bdi) == 21, len(bdi)

tests['bdi2'] = OrderedDict(
    id='bdi2',
    title='پرسش‌نامه افسردگی بک (BDI-II)',
    short='افسردگی بک',
    blurb='ارزیابی کوتاه و سریع خلق و نشانه‌های افسردگی در دو هفته گذشته. برای هر موضوع، گزینه‌ای را انتخاب کنید که بیشتر از همه وضعیت این روزهای شما را توصیف می‌کند.',
    minutes=7,
    choices=None,
    questions=bdi,
    scales=[],
    totalMax=63,
    totalBands=[
        OrderedDict(upTo=13, level='افسردگی کمینه / وضعیت طبیعی',
                    message='نشانه‌های معناداری از افت خلق یا افسردگی مشاهده نمی‌شود.'),
        OrderedDict(upTo=19, level='افسردگی خفیف',
                    message='شما مقداری افت انرژی و تغییر خلق را تجربه می‌کنید که با راهکارهای مراقبت فردی و مشاوره قابل مدیریت است.'),
        OrderedDict(upTo=28, level='افسردگی متوسط',
                    message='نشانه‌های افت خلق روی عملکرد و انگیزه روزمره شما تأثیر گذاشته است. پیشنهاد می‌شود برای ریشه‌یابی با درمانگر گفتگو کنید.'),
        OrderedDict(upTo=63, level='افسردگی شدید',
                    message='نشانه‌های بالینی نشان‌دهنده فشار روانی قابل‌توجهی است. رزرو جلسه ارزیابی و مشاوره با درمانگر برای بهبود کیفیت زندگی شما بسیار ضروری است.'),
    ],
    disclosesResult=True,
    safety=OrderedDict(
        questionId=9,
        atLeast=2,
        message='اگر به فکر آسیب زدن به خودتان هستید، همین حالا با اورژانس اجتماعی ۱۲۳ تماس بگیرید. تنها نمانید و موضوع را با فردی که به او اعتماد دارید در میان بگذارید. لطفاً در اولین فرصت جلسه مشاوره فوری رزرو کنید.',
    ),
    cta='این نتیجه یک غربالگری اولیه است و جای تشخیص تخصصی را نمی‌گیرد. برای بررسی ریشه‌ای و برنامه درمان، جلسه مشاوره خود را رزرو کنید.',
)

# ------------------------------------------------------------------ ENRICH
block = section('| Q1 | همسرم ویژگی‌های رفتاری دارد', 'کلید تفکیک مقیاس‌ها')
enrich, pairs = [], []
for qid, text, subscale, reverse in rows(block, 4):
    label = strip_english(subscale)
    pairs.append((label, label, None, int(qid[1:])))
    q = OrderedDict(id=int(qid[1:]), text=clean(text), scale=label)
    if 'بله' in reverse:
        q['reverse'] = True
    enrich.append(q)
assert len(enrich) == 35, len(enrich)

tests['enrich'] = OrderedDict(
    id='enrich',
    title='پرسش‌نامه سازگاری زناشویی انریچ (ENRICH)',
    short='سازگاری زناشویی انریچ',
    blurb='سنجش کیفیت رابطه زناشویی در حوزه‌هایی مانند گفت‌وگو، حل تعارض، مسائل مالی و صمیمیت. پاسخ‌ها را بر اساس وضعیت واقعی رابطه‌تان انتخاب کنید، نه آنچه دوست دارید باشد.',
    minutes=12,
    choices=[
        OrderedDict(label='کاملاً مخالفم', value=1),
        OrderedDict(label='مخالفم', value=2),
        OrderedDict(label='نظری ندارم', value=3),
        OrderedDict(label='موافقم', value=4),
        OrderedDict(label='کاملاً موافقم', value=5),
    ],
    reverseFrom=6,
    questions=enrich,
    scales=scales_from(pairs, lambda n: n * 5),
    totalMax=175,
    totalBands=[
        OrderedDict(upTo=70, level='ناسازگاری شدید / رابطه در معرض خطر',
                    message='رابطه شما در چندین حوزه کلیدی دچار چالش جدی است. بازسازی این رابطه نیازمند مداخله تخصصی و جلسات زوج‌درمانی است.'),
        OrderedDict(upTo=105, level='سازگاری پایین تا متوسط',
                    message='در برخی مهارت‌های پایه‌ای مانند گفت‌وگو و حل اختلاف چالش‌هایی وجود دارد که با جلسات مشاوره زوج قابل ترمیم و ارتقاست.'),
        OrderedDict(upTo=140, level='سازگاری خوب و مطلوب',
                    message='پایه رابطه شما قوی و رضایت‌بخش است و با یادگیری چند مهارت تکمیلی می‌توانید صمیمیت رابطه را افزایش دهید.'),
        OrderedDict(upTo=175, level='سازگاری عالی و پیوند عمیق',
                    message='سطح تفاهم و رضایت شما از رابطه بسیار بالاست. حفظ و مراقبت از این دستاورد ارزشمند است.'),
    ],
    disclosesResult=True,
    cta='برای کار روی حوزه‌هایی که نمره پایین‌تری گرفته‌اند، جلسه مشاوره زوج را رزرو کنید.',
)

# ------------------------------------------------------------------ YSQ-S3
block = section('| Q1 | افراد مهم زندگی‌ام در نهایت', 'منطق نمره‌دهی و خروجی نموداری')
ysq, pairs = [], []
for qid, text, schema, domain in rows(block, 4):
    label, area = strip_english(schema), clean(domain)
    # Five consecutive questions per schema, per the instrument's own structure.
    pairs.append(((int(qid[1:]) - 1) // 5, label, area, int(qid[1:])))
    ysq.append(OrderedDict(id=int(qid[1:]), text=clean(text), scale=label))
assert len(ysq) == 75, len(ysq)
ysq_scales = scales_from(pairs, lambda n: n * 6)
assert len(ysq_scales) == 15, len(ysq_scales)
for question in ysq:
    question['scale'] = ysq_scales[(question['id'] - 1) // 5]['title']

tests['ysq_s3'] = OrderedDict(
    id='ysq_s3',
    title='پرسش‌نامه طرحواره‌های یانگ (YSQ-S3)',
    short='طرحواره‌های یانگ',
    blurb='شناسایی ۱۵ تله شخصیتی یا «طرحواره ناسازگار اولیه» — الگوهای تکرارشونده‌ای که ریشه در دوران کودکی دارند و امروز بر روابط و تصمیم‌های شما اثر می‌گذارند. طولانی‌ترین آزمون این مجموعه است؛ در آرامش پاسخ دهید.',
    minutes=20,
    choices=[
        OrderedDict(label='کاملاً غلط', value=1),
        OrderedDict(label='غالباً غلط', value=2),
        OrderedDict(label='تا حدی درست', value=3),
        OrderedDict(label='نسبتاً درست', value=4),
        OrderedDict(label='غالباً درست', value=5),
        OrderedDict(label='کاملاً درست', value=6),
    ],
    questions=ysq,
    scales=ysq_scales,
    scaleBands=[
        OrderedDict(upTo=10, level='غیرفعال', message='این طرحواره در شما فعال نیست.'),
        OrderedDict(upTo=17, level='ضعیف', message='در شرایط استرس شدید ممکن است فعال شود.'),
        OrderedDict(upTo=24, level='متوسط', message='بر تصمیم‌ها و روابط شما اثر می‌گذارد.'),
        OrderedDict(upTo=30, level='شدید و ریشه‌دار', message='یکی از تله‌های اصلی زندگی شماست.'),
    ],
    highlightFrom=18,
    disclosesResult=True,
    resultIntro='تله‌های شخصیتی مشخص‌شده، الگوهای تکراری دوران کودکی هستند که در ناخودآگاه شما جریان دارند. شناخت و بازسازی این الگوها در جلسات تخصصی طرحواره‌درمانی انجام می‌پذیرد.',
    cta='برای کار روی طرحواره‌های پررنگ‌شده، جلسه طرحواره‌درمانی خود را رزرو کنید.',
)

# ------------------------------------------------------------------ NEO-FFI
block = section('| Q1 | من فردی نیستم که زیاد نگران باشم.', 'منطق نمره‌دهی و خروجی تفسیری')
neo, pairs = [], []
for qid, text, dimension, reverse in rows(block, 4):
    label = strip_english(dimension)
    pairs.append((label, label, None, int(qid[1:])))
    q = OrderedDict(id=int(qid[1:]), text=clean(text), scale=label)
    if 'بله' in reverse:
        q['reverse'] = True
    neo.append(q)
assert len(neo) == 60, len(neo)

neo_bands = {
    'روان‌رنجوری': ['ثبات هیجانی عالی و آرامش بالا', 'تعادل عاطفی متوسط',
                    'حساسیت هیجانی و آسیب‌پذیری بالا نسبت به استرس'],
    'برون‌گرایی': ['درون‌گرایی، نیاز به تنهایی و آرامش', 'میان‌گرایی و تعادل در تعاملات',
                   'برون‌گرایی بالا، اجتماعی و پرشور'],
    'گشودگی به تجربه': ['واقع‌گرایی، علاقه به روش‌های سنتی', 'تعادل بین واقعیت و خلاقیت',
                        'روحیه اکتشافی بالا، خلاق و اهل هنر و ایده'],
    'توافق‌پذیری': ['روحیه رقابتی و سرسخت', 'تعادل در همکاری و مرزبندی',
                    'همدلی بسیار بالا، مهربان و فداکار'],
    'باوجدانی/وظیفه‌شناسی': ['منعطف، خودانگیخته و با چارچوب‌های باز', 'نظم و انضباط متعادل',
                             'نظم فوق‌العاده بالا، مسئولیت‌پذیر و کمال‌گرا'],
}
neo_scales = scales_from(pairs, lambda n: n * 4)
for scale in neo_scales:
    assert scale['max'] == 48, scale
    low, mid, high = neo_bands[scale['title']]
    scale['bands'] = [
        OrderedDict(upTo=15, level=low, message=''),
        OrderedDict(upTo=30, level=mid, message=''),
        OrderedDict(upTo=48, level=high, message=''),
    ]

tests['neo_ffi'] = OrderedDict(
    id='neo_ffi',
    title='آزمون پنج عاملی شخصیت نئو (NEO-FFI)',
    short='شخصیت‌شناسی نئو',
    blurb='معتبرترین آزمون خودشناسی جهان، که شخصیت را در پنج بُعد بنیادین می‌سنجد: روان‌رنجوری، برون‌گرایی، گشودگی، توافق‌پذیری و وظیفه‌شناسی. اولین پاسخی که به ذهنتان می‌رسد معمولاً درست‌ترین است.',
    minutes=15,
    choices=[
        OrderedDict(label='کاملاً مخالفم', value=0),
        OrderedDict(label='مخالفم', value=1),
        OrderedDict(label='نظری ندارم', value=2),
        OrderedDict(label='موافقم', value=3),
        OrderedDict(label='کاملاً موافقم', value=4),
    ],
    reverseFrom=4,
    questions=neo,
    scales=neo_scales,
    disclosesResult=True,
    cta='این نتایج تصویر اولیه‌ای از ویژگی‌های شماست. برای تحلیل کاربردی این الگوها در روابط، شغل و توسعه فردی، جلسه مشاوره خود را رزرو کنید.',
)

# ------------------------------------------------------------------ MCMI
block = section('| Q1 | به ندرت پیش می‌آید از ته دل', 'فرمت ارسال خروجی به ادمین')
mcmi, pairs = [], []
for qid, text, subscale in rows(block, 3):
    label = strip_english(subscale)
    pairs.append((label, label, None, int(qid[1:])))
    mcmi.append(OrderedDict(id=int(qid[1:]), text=clean(text), scale=label))
assert len(mcmi) == 50, len(mcmi)

tests['mcmi'] = OrderedDict(
    id='mcmi',
    title='پرسش‌نامه بالینی چندمحوری میلون (MCMI — فرم غربالگری)',
    short='غربالگری بالینی میلون',
    blurb='آزمون تخصصی پیش از شروع درمان فردی. پاسخ‌های شما مستقیماً و به‌صورت محرمانه در اختیار درمانگر قرار می‌گیرد و نتیجه آن در جلسه مشاوره بررسی می‌شود.',
    minutes=10,
    choices=[
        OrderedDict(label='بلی', value=1),
        OrderedDict(label='خیر', value=0),
    ],
    questions=mcmi,
    scales=scales_from(pairs, lambda n: n * 1),
    disclosesResult=False,
    privateNotice='پاسخ‌های شما با موفقیت ثبت شد و پروفایل بالینی شما جهت بررسی دقیق و تخصصی برای خانم دکتر ارسال گردید. برای تحلیل و دریافت گزارش نهایی، می‌توانید جلسه مشاوره خود را تنظیم فرمایید.',
    cta='برای بررسی نتیجه این غربالگری، جلسه مشاوره خود را رزرو کنید.',
)

# ------------------------------------------------------------------- write
HEADER = """/**
 * %s
 *
 * GENERATED by scripts/build-tests.py from the therapist's specification.
 * Edit the source document and re-run rather than editing this file.
 */
import type { PsyTest } from './types'

export const %s: PsyTest = %s
"""

names = {'bdi2': 'bdi2', 'enrich': 'enrich', 'ysq_s3': 'ysqS3', 'neo_ffi': 'neoFfi', 'mcmi': 'mcmi'}
for key, test in tests.items():
    body = ts(test)
    io.open('src/content/tests/%s.ts' % key, 'w', encoding='utf-8', newline='\n').write(
        HEADER % (test['title'], names[key], body)
    )
    print('%-9s %3d questions, %2d scales' % (key, len(test['questions']), len(test['scales'])))

index = """/**
 * The questionnaires the practice offers.
 *
 * The questions live in code rather than the database: they are editorial
 * content that changes only when the therapist revises an instrument, and
 * keeping them here means scoring and wording can never drift apart. Only the
 * prices — which the practice edits — are stored.
 */
import type { PsyTest } from './types'
%s

export * from './types'

/** Presentation order on the public list. */
export const TESTS: readonly PsyTest[] = [%s]

export const TEST_IDS = TESTS.map((test) => test.id)

export function findTest(id: string): PsyTest | undefined {
  return TESTS.find((test) => test.id === id)
}
"""
imports = '\n'.join("import { %s } from './%s'" % (names[k], k) for k in tests)
listing = ', '.join(names[k] for k in tests)
io.open('src/content/tests/index.ts', 'w', encoding='utf-8', newline='\n').write(
    index % (imports, listing)
)
print('wrote src/content/tests/index.ts')
