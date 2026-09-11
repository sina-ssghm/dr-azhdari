import { BookingCta } from '@/components/sections/booking-cta'
import { Hero } from '@/components/sections/hero'
import { HypnotherapyBand } from '@/components/sections/hypnotherapy-band'
import { IntroVideo } from '@/components/sections/intro-video'
import { Services } from '@/components/sections/services'
import { Testimonials } from '@/components/sections/testimonials'
import { WhyCounselling } from '@/components/sections/why-counselling'

// The testimonials read from the database, so this page cannot be rendered at
// build time — there is no database when the image is built.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Before the services: meeting the person comes before reading the
          list of what she offers. */}
      <IntroVideo />
      <Services />
      <HypnotherapyBand />
      {/* Between what she offers and the invitation to book: hearing from
          someone who went first is what carries a hesitant reader across. */}
      <Testimonials />
      <BookingCta />
      <WhyCounselling />
    </>
  )
}
