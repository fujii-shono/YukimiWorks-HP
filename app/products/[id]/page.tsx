import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { corporateProducts } from '@/data/corporateProducts';

export function generateStaticParams() {
  return corporateProducts.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = corporateProducts.find((item) => item.id === id);
  if (!product) return {};
  return {
    title: `${product.title} | YukimiWorks`,
    description: product.summary,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = corporateProducts.find((item) => item.id === id);
  if (!product) notFound();

  return (
    <CorporateLayout>
      <article className="corporate-product-detail">
        <div className="corporate-container">
          <Link href="/products" className="corporate-back-link">自社プロダクト一覧へ戻る</Link>
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={`${product.title}の画面`}
              width={product.thumbnailWidth ?? 1306}
              height={product.thumbnailHeight ?? 740}
              className="corporate-product-hero-image"
              priority
            />
          ) : null}
          <header>
            <h1>{product.title}</h1>
            <p className="corporate-product-catchphrase">{product.summary}</p>
          </header>
          <div className="corporate-product-body">
            <section>
              <h2>こんな課題に</h2>
              <p>{product.challenge}</p>
            </section>
            <section>
              <h2>できること</h2>
              <ul>
                {product.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
              </ul>
            </section>
            <span className="corporate-product-category">{product.category}</span>
            {product.supportedSocialNetworks ? (
              <section>
                <h2>対応SNS</h2>
                <ul>
                  {product.supportedSocialNetworks.map((socialNetwork) => <li key={socialNetwork}>{socialNetwork}</li>)}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </CorporateLayout>
  );
}
