import { Icon } from '@/components/icons'
import { Container } from '@/components/ui/container'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { whyCounselling } from '@/content/site'

export function WhyCounselling() {
  return (
    <section id="why" className="bg-sand-50 pb-20 lg:pb-28">
      <Container>
        <Reveal>
          <SectionHeading title={whyCounselling.title} />
        </Reveal>

        <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
          {whyCounselling.items.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 90}
              className="flex flex-col items-center px-2 text-center"
            >
              <span className="bg-sand-200 grid size-[3.5rem] place-items-center rounded-full text-olive-700 transition-colors duration-300">
                <Icon name={item.icon} strokeWidth={1.4} className="size-[1.45rem]" />
              </span>

              <h3 className="text-ink-900 mt-5 text-[0.8125rem] leading-snug font-semibold">
                {item.title}
              </h3>

              <p className="text-ink-400 mt-2 text-[0.75rem] leading-[1.95]">
                {item.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  )
}
