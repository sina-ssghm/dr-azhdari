import { TestimonialsSlider, type Slide } from './testimonials-slider'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { testimonials } from '@/content/testimonials'
import { findCountry } from '@/lib/phone'
import { listApprovedTestimonials } from '@/server/testimonials'

/**
 * What clients say, one at a time.
 *
 * The comments come from the database: visitors submit them through the dialog
 * the slider opens, and only what the practice has approved is read here.
 *
 * Countries are resolved server-side so the client bundle does not pull in the
 * phone-number library for the sake of a flag.
 */
export async function Testimonials() {
  // A database that is briefly unreachable should cost the homepage this
  // section, not the whole page.
  const approved = await listApprovedTestimonials().catch((error) => {
    console.error('[testimonials] could not be read', error)
    return []
  })

  const slides: Slide[] = approved.map((item) => ({
    name: item.name,
    quote: item.quote,
    country: item.countryCode ? findCountry(item.countryCode) : undefined,
  }))

  return (
    <section id="testimonials" className="bg-sand-100 py-16 lg:py-20">
      <Container>
        <Reveal>
          <SectionHeading
            title={testimonials.title}
            description={testimonials.description}
          />
        </Reveal>

        <Reveal>
          <TestimonialsSlider slides={slides} anonymous={testimonials.anonymous} />
        </Reveal>
      </Container>
    </section>
  )
}
