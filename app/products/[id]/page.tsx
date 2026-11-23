import type { Metadata } from 'next';
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
          <header>
            <h1>{product.title}</h1>
          </header>
          <div className="corporate-product-body">
            <p>{product.summary}</p>
          </div>
        </div>
      </article>
    </CorporateLayout>
  );
}
