import Image from 'next/image';

type CorporateBannerProps = {
  priority?: boolean;
  decorative?: boolean;
};

export function CorporateBanner({ priority = false, decorative = false }: CorporateBannerProps) {
  return (
    <section
      className="corporate-hero"
      aria-label={decorative ? undefined : 'YukimiWorksのメインビジュアル'}
      aria-hidden={decorative || undefined}
    >
      <Image
        src="/brand/corporate-hero.webp"
        alt={decorative ? '' : '制作した光が街へつながっていく、夜のアトリエのイラスト'}
        width={3000}
        height={1000}
        className="corporate-hero-image"
        priority={priority}
        sizes="100vw"
      />
    </section>
  );
}
