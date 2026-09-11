'use client'

import { useActionState } from 'react'
import { saveSettingsAction, type SettingsState } from './actions'
import { DigitsInput } from '@/components/admin/digits-input'
import { SubmitButton } from '@/components/admin/submit-button'
import { Card, Field, Notice, inputClass } from '@/components/admin/ui'
import { admin } from '@/content/admin'
import { contact as contactDefaults } from '@/content/site'
import type { Settings } from '@/server/settings'

const initial: SettingsState = {}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveSettingsAction, initial)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.success ? <Notice tone="success">{admin.saved}</Notice> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card
          title="پرداخت داخل ایران — کارت به کارت"
          description="این اطلاعات پس از ثبت رزرو به مراجع نمایش داده می‌شود."
        >
          <div className="flex flex-col gap-4">
            <Field label="شماره کارت" htmlFor="card_number" hint="۱۶ رقم.">
              <DigitsInput
                id="card_number"
                name="card_number"
                defaultValue={settings.card_number}
                length={16}
                placeholder="6037 9979 1234 5678"
              />
            </Field>

            <Field
              label="شماره شبا"
              htmlFor="card_sheba"
              hint="۲۴ رقم. «IR» را وارد نکنید — به‌صورت خودکار افزوده می‌شود."
            >
              <DigitsInput
                id="card_sheba"
                name="card_sheba"
                defaultValue={settings.card_sheba}
                length={24}
                prefix="IR"
                placeholder="8205 4010 2680 0208 1790 9002"
              />
            </Field>

            <Field label="به نام" htmlFor="card_holder">
              <input
                id="card_holder"
                name="card_holder"
                type="text"
                defaultValue={settings.card_holder}
                placeholder="زهره اژدری"
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="پرداخت خارج از ایران — تتر (USDT)"
          description="کد QR به‌صورت خودکار از روی همین آدرس ساخته می‌شود."
        >
          <div className="flex flex-col gap-4">
            <Field
              label="آدرس کیف پول"
              htmlFor="usdt_address"
              hint="آدرس را مستقیماً از کیف پول خود کپی کنید."
            >
              <input
                id="usdt_address"
                name="usdt_address"
                type="text"
                dir="ltr"
                defaultValue={settings.usdt_address}
                placeholder="TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={`${inputClass} text-start font-mono`}
              />
            </Field>

            <Field
              label="شبکه"
              htmlFor="usdt_network"
              hint="مثلاً TRC20 یا ERC20 — برای جلوگیری از ارسال در شبکه اشتباه."
            >
              <input
                id="usdt_network"
                name="usdt_network"
                type="text"
                dir="ltr"
                defaultValue={settings.usdt_network}
                placeholder="TRC20"
                className={`${inputClass} text-start uppercase`}
              />
            </Field>
          </div>
        </Card>
      </div>

      <Card
        title="اطلاعات تماس — پاورقی سایت"
        description="این اطلاعات در پاورقی همه صفحه‌های سایت نمایش داده می‌شود. هر فیلدی که خالی بماند، مقدار پیش‌فرض (متن کم‌رنگ داخل کادر) نمایش داده می‌شود."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="شماره دوم منشی"
            htmlFor="contact_phone_primary"
            hint="زیر همان برچسب منشی، پایین‌تر از شماره اول نمایش داده می‌شود."
          >
            <input
              id="contact_phone_primary"
              name="contact_phone_primary"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="off"
              defaultValue={settings.contact_phone_primary}
              placeholder={contactDefaults.contact_phone_primary}
              className={`${inputClass} text-start`}
            />
          </Field>

          <Field
            label="شماره اول منشی"
            htmlFor="contact_phone_secondary"
            hint="با ارقام فارسی هم می‌توانید وارد کنید."
          >
            <input
              id="contact_phone_secondary"
              name="contact_phone_secondary"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="off"
              defaultValue={settings.contact_phone_secondary}
              placeholder={contactDefaults.contact_phone_secondary}
              className={`${inputClass} text-start`}
            />
          </Field>

          <Field
            label="برچسب شماره‌های منشی"
            htmlFor="contact_phone_secondary_label"
            hint="یک برچسب برای هر دو شماره بالا."
          >
            <input
              id="contact_phone_secondary_label"
              name="contact_phone_secondary_label"
              type="text"
              defaultValue={settings.contact_phone_secondary_label}
              placeholder={contactDefaults.contact_phone_secondary_label}
              className={inputClass}
            />
          </Field>

          <Field
            label="شماره همراه"
            htmlFor="contact_phone_mobile"
            hint="همان شماره‌ای که دکمه‌های «تماس مستقیم» و واتس‌اپ با آن تماس می‌گیرند."
          >
            <input
              id="contact_phone_mobile"
              name="contact_phone_mobile"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="off"
              defaultValue={settings.contact_phone_mobile}
              placeholder={contactDefaults.contact_phone_mobile}
              className={`${inputClass} text-start`}
            />
          </Field>

          <Field label="برچسب شماره همراه" htmlFor="contact_phone_mobile_label">
            <input
              id="contact_phone_mobile_label"
              name="contact_phone_mobile_label"
              type="text"
              defaultValue={settings.contact_phone_mobile_label}
              placeholder={contactDefaults.contact_phone_mobile_label}
              className={inputClass}
            />
          </Field>

          <Field label="ایمیل" htmlFor="contact_email">
            {/* `type="text"`, not `type="email"`: the browser's native
                validation would block the whole form — payment details
                included — on a half-typed address, with a message in its own
                language. The action checks the shape and says so in Persian. */}
            <input
              id="contact_email"
              name="contact_email"
              type="text"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              defaultValue={settings.contact_email}
              placeholder={contactDefaults.contact_email}
              className={`${inputClass} text-start`}
            />
          </Field>

          <Field label="نام مطب / کلینیک" htmlFor="contact_clinic">
            <input
              id="contact_clinic"
              name="contact_clinic"
              type="text"
              defaultValue={settings.contact_clinic}
              placeholder={contactDefaults.contact_clinic}
              className={inputClass}
            />
          </Field>

          <Field
            label="نشانی"
            htmlFor="contact_address"
            className="sm:col-span-2"
            hint="در پاورقی یک‌پارچه نمایش داده می‌شود؛ خطوط جدید به فاصله تبدیل می‌شوند."
          >
            <textarea
              id="contact_address"
              name="contact_address"
              rows={2}
              defaultValue={settings.contact_address}
              placeholder={contactDefaults.contact_address}
              className={`${inputClass} resize-y leading-[2]`}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="اعلان تلگرام"
        description="ربات را در @BotFather بسازید و توکن آن را اینجا ذخیره کنید. اتصال گیرنده‌ها از دکمه «اعلان‌ها» در داشبورد انجام می‌شود."
      >
        <Field
          label="توکن ربات"
          htmlFor="telegram_bot_token"
          hint="یک ربات، چند گیرنده. با تغییر توکن، گیرنده‌های فعلی باید دوباره متصل شوند."
        >
          <input
            id="telegram_bot_token"
            name="telegram_bot_token"
            type="text"
            dir="ltr"
            autoComplete="off"
            defaultValue={settings.telegram_bot_token}
            placeholder="123456789:AAE..."
            className={`${inputClass} text-start font-mono`}
          />
        </Field>
      </Card>

      <div>
        <SubmitButton>{admin.save}</SubmitButton>
      </div>
    </form>
  )
}
