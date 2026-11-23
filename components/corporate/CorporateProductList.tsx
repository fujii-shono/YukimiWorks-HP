import Image from 'next/image';
import Link from 'next/link';
import { corporateProducts } from '@/data/corporateProducts';

type CorporateProductListProps = {
  layout?: 'carousel' | 'stacked';
};

export function CorporateProductList({ layout = 'carousel' }: CorporateProductListProps) {
  return (
    <div
      className={layout === 'stacked' ? 'corporate-product-list-stacked' : 'corporate-home-product-grid'}
      role="list"
      aria-label="プロダクト一覧"
      tabIndex={layout === 'carousel' ? 0 : undefined}
    >
      {corporateProducts.map((product) => (
        <article key={product.id} className="corporate-home-product-card" role="listitem">
          <div className="corporate-home-product-thumbnail" aria-hidden={!product.thumbnail}>
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={`${product.title}の画面`}
                width={1306}
                height={740}
                className="corporate-home-product-thumbnail-image"
              />
            ) : null}
          </div>
          <Link href={`/products/${product.id}`} className="corporate-home-product-card-link">
            <h3>{product.title}</h3>
            <p>{product.summary}</p>
            <strong>詳しく見る</strong>
          </Link>
        </article>
      ))}
    </div>
  );
}
